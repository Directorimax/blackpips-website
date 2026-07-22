begin;

create sequence if not exists public.course_certificate_number_seq;

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  certificate_number text not null unique,
  issued_at timestamptz not null default now(),
  completion_percentage numeric(5,2) not null default 100.00 check (completion_percentage between 0 and 100),
  pdf_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists course_certificates_user_issued_idx
  on public.course_certificates (user_id, issued_at desc);
create index if not exists course_certificates_course_issued_idx
  on public.course_certificates (course_id, issued_at desc);

alter table public.course_certificates enable row level security;

drop policy if exists "Learners can view own certificates" on public.course_certificates;
create policy "Learners can view own certificates"
  on public.course_certificates for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.issue_course_certificate(
  p_user_id uuid,
  p_course_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  total_published_lessons integer;
  completed_published_lessons integer;
  certificate_id uuid;
begin
  if not exists (
    select 1
    from public.purchases as purchase
    where purchase.user_id = p_user_id
      and purchase.course_id = p_course_id
      and purchase.payment_status = 'approved'
  ) then
    return null;
  end if;

  select count(*)::integer
    into total_published_lessons
  from public.lessons as lesson
  where lesson.course_id = p_course_id
    and lesson.is_published = true;

  if total_published_lessons = 0 then
    return null;
  end if;

  select count(distinct progress.lesson_id)::integer
    into completed_published_lessons
  from public.lesson_progress as progress
  join public.lessons as lesson on lesson.id = progress.lesson_id
  where progress.user_id = p_user_id
    and progress.course_id = p_course_id
    and progress.is_completed = true
    and lesson.course_id = p_course_id
    and lesson.is_published = true;

  if completed_published_lessons <> total_published_lessons then
    return null;
  end if;

  insert into public.course_certificates (
    user_id,
    course_id,
    certificate_number,
    completion_percentage
  )
  values (
    p_user_id,
    p_course_id,
    format(
      'BP-%s-%s',
      to_char(now(), 'YYYY'),
      lpad(nextval('public.course_certificate_number_seq')::text, 6, '0')
    ),
    100.00
  )
  on conflict (user_id, course_id) do nothing
  returning id into certificate_id;

  if certificate_id is null then
    select certificate.id into certificate_id
    from public.course_certificates as certificate
    where certificate.user_id = p_user_id
      and certificate.course_id = p_course_id;
  end if;

  return certificate_id;
end;
$$;

create or replace function public.award_certificate_after_lesson_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_completed = true and (tg_op = 'INSERT' or old.is_completed is distinct from true) then
    perform public.issue_course_certificate(new.user_id, new.course_id);
  end if;
  return new;
end;
$$;

drop trigger if exists award_course_certificate_on_lesson_completion on public.lesson_progress;
create trigger award_course_certificate_on_lesson_completion
  after insert or update of is_completed on public.lesson_progress
  for each row execute function public.award_certificate_after_lesson_completion();

insert into public.course_certificates (
  user_id,
  course_id,
  certificate_number,
  issued_at,
  completion_percentage
)
select
  eligible.user_id,
  eligible.course_id,
  format(
    'BP-%s-%s',
    to_char(now(), 'YYYY'),
    lpad(nextval('public.course_certificate_number_seq')::text, 6, '0')
  ),
  eligible.completed_at,
  100.00
from (
  select
    purchase.user_id,
    purchase.course_id,
    coalesce(max(progress.completed_at), now()) as completed_at
  from public.purchases as purchase
  join public.lessons as lesson
    on lesson.course_id = purchase.course_id
    and lesson.is_published = true
  join public.lesson_progress as progress
    on progress.user_id = purchase.user_id
    and progress.course_id = purchase.course_id
    and progress.lesson_id = lesson.id
    and progress.is_completed = true
  where purchase.payment_status = 'approved'
  group by purchase.user_id, purchase.course_id
  having count(distinct progress.lesson_id) = count(distinct lesson.id)
) as eligible
on conflict (user_id, course_id) do nothing;

create or replace function public.my_course_certificates()
returns table (
  id uuid,
  course_id uuid,
  course_name text,
  certificate_number text,
  issued_at timestamptz,
  completion_percentage numeric,
  pdf_generated boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    certificate.id,
    certificate.course_id,
    course.title::text,
    certificate.certificate_number,
    certificate.issued_at,
    certificate.completion_percentage,
    certificate.pdf_generated
  from public.course_certificates as certificate
  join public.courses as course on course.id = certificate.course_id
  where certificate.user_id = auth.uid()
  order by certificate.issued_at desc;
end;
$$;

create or replace function public.get_course_certificate(p_certificate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  certificate_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select jsonb_build_object(
    'id', certificate.id,
    'course_id', certificate.course_id,
    'course_name', course.title,
    'student_name', coalesce(profile.full_name, account.email),
    'certificate_number', certificate.certificate_number,
    'issued_at', certificate.issued_at,
    'completion_percentage', certificate.completion_percentage
  ) into certificate_data
  from public.course_certificates as certificate
  join public.courses as course on course.id = certificate.course_id
  join auth.users as account on account.id = certificate.user_id
  left join public.profiles as profile on profile.id = certificate.user_id
  where certificate.id = p_certificate_id
    and (certificate.user_id = auth.uid() or public.is_admin());

  if certificate_data is null then
    raise exception 'Certificate not found';
  end if;

  return certificate_data;
end;
$$;

create or replace function public.admin_list_course_certificates(p_search text default null)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  course_id uuid,
  course_name text,
  certificate_number text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    certificate.id,
    certificate.user_id,
    coalesce(profile.full_name, account.email)::text as display_name,
    account.email::text,
    certificate.course_id,
    course.title::text as course_name,
    certificate.certificate_number::text,
    certificate.issued_at
  from public.course_certificates as certificate
  join auth.users as account on account.id = certificate.user_id
  left join public.profiles as profile on profile.id = certificate.user_id
  join public.courses as course on course.id = certificate.course_id
  where coalesce(trim(p_search), '') = ''
    or lower(concat_ws(' ', profile.full_name, account.email, course.title, certificate.certificate_number))
      like '%' || lower(trim(p_search)) || '%'
  order by certificate.issued_at desc;
end;
$$;

revoke all on function public.issue_course_certificate(uuid, uuid) from public;
revoke all on function public.award_certificate_after_lesson_completion() from public;
revoke all on function public.get_course_certificate(uuid) from public;
revoke all on function public.admin_list_course_certificates(text) from public;
grant execute on function public.my_course_certificates() to authenticated;
grant execute on function public.get_course_certificate(uuid) to authenticated;
grant execute on function public.admin_list_course_certificates(text) to authenticated;

commit;
