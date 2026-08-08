begin;

create table if not exists public.alc_access_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null, study_year integer not null, email text not null, phone text not null,
  program text not null, other_program text, additional_details text,
  status text not null default 'pending', admin_notes text, reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint alc_access_requests_status_check check (status in ('pending','approved','rejected')),
  constraint alc_access_requests_program_check check (program in ('Regular Class','Advanced Class','Master Class','Live Classes','Online Classes','Other')),
  constraint alc_access_requests_year_check check (study_year between 2010 and extract(year from now())::integer),
  constraint alc_access_requests_lengths_check check (char_length(full_name) between 2 and 120 and char_length(email) between 3 and 255 and char_length(phone) between 7 and 32 and coalesce(char_length(other_program),0) <= 80 and coalesce(char_length(additional_details),0) <= 1000)
);
create unique index if not exists alc_access_one_pending_per_user on public.alc_access_requests(user_id) where status = 'pending';
create index if not exists alc_access_requests_status_created_idx on public.alc_access_requests(status, created_at desc);

create table if not exists public.alc_access_videos (
  id uuid primary key default gen_random_uuid(), title text not null, description text, video_url text not null,
  section text not null default 'ALC Library', sort_order integer not null default 0, is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint alc_access_videos_lengths_check check (char_length(title) between 1 and 160 and coalesce(char_length(description),0) <= 1000 and char_length(video_url) between 1 and 1000 and char_length(section) between 1 and 80)
);

-- A failed pre-repair run may have reached this table definition before the
-- parser stopped at the old function signature. Preserve any rows while
-- normalizing the legacy identifier.
do $repair$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='alc_access_videos' and column_name='position')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='alc_access_videos' and column_name='sort_order') then
    alter table public.alc_access_videos rename column position to sort_order;
  end if;
end $repair$;
alter table public.alc_access_videos add column if not exists sort_order integer not null default 0;

alter table public.alc_access_requests enable row level security;
alter table public.alc_access_videos enable row level security;
drop policy if exists "Users read own ALC access requests" on public.alc_access_requests;
create policy "Users read own ALC access requests" on public.alc_access_requests for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_alc_access_request(p_full_name text, p_study_year integer, p_email text, p_phone text, p_program text, p_other_program text default null, p_additional_details text default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare request_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_full_name !~ '^[[:print:]]{2,120}$' or p_full_name ~ '[[:cntrl:]]' then raise exception 'Invalid full name'; end if;
  if p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(p_email) > 255 then raise exception 'Invalid email'; end if;
  if p_phone !~ '^[0-9+() -]{7,32}$' then raise exception 'Invalid phone number'; end if;
  if p_study_year < 2010 or p_study_year > extract(year from now()) then raise exception 'Invalid study year'; end if;
  if p_program not in ('Regular Class','Advanced Class','Master Class','Live Classes','Online Classes','Other') or (p_program = 'Other' and coalesce(char_length(trim(p_other_program)),0) = 0) then raise exception 'Invalid program'; end if;
  if coalesce(char_length(p_other_program),0) > 80 or coalesce(char_length(p_additional_details),0) > 1000 then raise exception 'Invalid request details'; end if;
  if exists(select 1 from public.alc_access_requests where user_id = auth.uid() and created_at > now() - interval '1 minute') then raise exception 'Please wait before submitting another request'; end if;
  insert into public.alc_access_requests(user_id,full_name,study_year,email,phone,program,other_program,additional_details)
  values(auth.uid(),trim(p_full_name),p_study_year,lower(trim(p_email)),trim(p_phone),p_program,nullif(trim(p_other_program),''),nullif(trim(p_additional_details),'')) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.admin_review_alc_access_request(p_request_id uuid, p_status text, p_admin_notes text default null)
returns table(id uuid, status text, reviewed_at timestamptz) language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid review status'; end if;
  update public.alc_access_requests set status=p_status, admin_notes=nullif(trim(p_admin_notes),''), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() where alc_access_requests.id=p_request_id;
  if not found then raise exception 'Request not found'; end if;
  return query select r.id,r.status,r.reviewed_at from public.alc_access_requests r where r.id=p_request_id;
end; $$;

create or replace function public.admin_list_alc_access_requests(p_status text default 'all')
returns table(id uuid,user_id uuid,full_name text,study_year integer,email text,phone text,program text,other_program text,additional_details text,status text,admin_notes text,created_at timestamptz,reviewed_at timestamptz) language sql security invoker set search_path=public as $$
 select r.id,r.user_id,r.full_name,r.study_year,r.email,r.phone,r.program,r.other_program,r.additional_details,r.status,r.admin_notes,r.created_at,r.reviewed_at from public.alc_access_requests r where public.is_admin() and (p_status='all' or r.status=p_status) order by r.created_at desc;
$$;
drop function if exists public.alc_access_library();
create function public.alc_access_library()
returns table(id uuid,title text,description text,video_url text,section text,sort_order integer) language sql security invoker set search_path=public as $$
 select v.id,v.title,v.description,v.video_url,v.section,v.sort_order from public.alc_access_videos v where v.is_published and exists(select 1 from public.alc_access_requests r where r.user_id=auth.uid() and r.status='approved') order by v.section,v.sort_order;
$$;
create or replace function public.alc_access_my_request()
returns table(id uuid,status text,created_at timestamptz) language sql security invoker set search_path=public as $$
 select r.id,r.status,r.created_at from public.alc_access_requests r where r.user_id=auth.uid() order by r.created_at desc limit 1;
$$;
revoke all on function public.submit_alc_access_request(text,integer,text,text,text,text,text), public.admin_review_alc_access_request(uuid,text,text), public.admin_list_alc_access_requests(text), public.alc_access_library(), public.alc_access_my_request() from public, anon;
grant execute on function public.submit_alc_access_request(text,integer,text,text,text,text,text), public.admin_review_alc_access_request(uuid,text,text), public.admin_list_alc_access_requests(text), public.alc_access_library(), public.alc_access_my_request() to authenticated;
commit;
