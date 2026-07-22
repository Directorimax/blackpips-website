begin;

alter table public.mentorship_applications drop constraint if exists mentorship_applications_status_check;
update public.mentorship_applications set status = case status
  when 'new' then 'pending'
  when 'waiting_list' then 'waitlisted'
  else status
end;
alter table public.mentorship_applications alter column status set default 'pending';
alter table public.mentorship_applications add constraint mentorship_applications_status_check check (status in ('pending', 'approved', 'rejected', 'waitlisted'));

create or replace function public.submit_mentorship_application(
  p_mentorship_package_id uuid, p_full_name text, p_email text, p_whatsapp_number text,
  p_country text, p_experience_level text, p_trading_duration text, p_biggest_challenge text,
  p_learning_goal text, p_preferred_schedule text, p_notes text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare application_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.mentorship_packages
    where id = p_mentorship_package_id and is_active
    for update;
  if not found then raise exception 'This mentorship package is currently unavailable'; end if;
  if exists (
    select 1 from public.mentorship_applications
    where user_id = auth.uid()
      and mentorship_package_id = p_mentorship_package_id
      and status in ('pending', 'approved', 'waitlisted')
  ) then
    raise exception 'You already have an active application for this mentorship package';
  end if;
  insert into public.mentorship_applications (
    user_id, mentorship_package_id, full_name, email, whatsapp_number, country,
    experience_level, trading_duration, biggest_challenge, learning_goal,
    preferred_schedule, notes, status
  ) values (
    auth.uid(), p_mentorship_package_id, trim(p_full_name), trim(p_email), trim(p_whatsapp_number), trim(p_country),
    lower(trim(p_experience_level)), trim(p_trading_duration), trim(p_biggest_challenge), trim(p_learning_goal),
    trim(p_preferred_schedule), nullif(trim(p_notes), ''), 'pending'
  ) returning id into application_id;
  return application_id;
end;
$$;

grant execute on function public.submit_mentorship_application(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

drop policy if exists "Admins can update mentorship applications" on public.mentorship_applications;
revoke update on public.mentorship_applications from authenticated;

create or replace function public.admin_list_mentorship_applications()
returns table (
  id uuid, full_name text, email text, whatsapp_number text, country text,
  package_name text, experience_level text, trading_duration text, biggest_challenge text,
  learning_goal text, preferred_schedule text, notes text, status text,
  internal_admin_notes text, learner_message text, created_at timestamptz,
  reviewed_at timestamptz, reviewed_by uuid
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query select a.id, a.full_name, a.email, a.whatsapp_number, a.country,
    p.name, a.experience_level, a.trading_duration, a.biggest_challenge,
    a.learning_goal, a.preferred_schedule, a.notes, a.status,
    a.internal_admin_notes, a.learner_message, a.created_at, a.reviewed_at, a.reviewed_by
  from public.mentorship_applications a join public.mentorship_packages p on p.id = a.mentorship_package_id
  order by a.created_at desc;
end;
$$;

create or replace function public.review_mentorship_application(
  p_application_id uuid, p_status text, p_internal_admin_notes text default null, p_learner_message text default null
) returns table (id uuid, status text, reviewed_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('approved', 'rejected', 'waitlisted') then raise exception 'Invalid mentorship review status'; end if;
  update public.mentorship_applications
  set status = p_status, internal_admin_notes = nullif(trim(p_internal_admin_notes), ''), learner_message = nullif(trim(p_learner_message), ''), reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
  where mentorship_applications.id = p_application_id
  returning mentorship_applications.id, mentorship_applications.status, mentorship_applications.reviewed_at into id, status, reviewed_at;
  if not found then raise exception 'Mentorship application not found'; end if;
  return next;
end;
$$;

grant execute on function public.admin_list_mentorship_applications() to authenticated;
grant execute on function public.review_mentorship_application(uuid, text, text, text) to authenticated;

commit;
