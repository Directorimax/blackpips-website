begin;

create table if not exists public.mentorship_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null,
  price_display text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.mentorship_packages (slug, name, short_description, price_display, display_order)
values
  ('regular-class', 'Regular Class', 'Live foundations coaching and direct mentor support.', 'TSh 250,000', 1),
  ('advanced-class', 'Advanced Class', 'Advanced execution coaching, market analysis and accountability.', 'TSh 500,000', 2),
  ('master-class', 'Master Class', 'Complete ALC mentorship with direct high-touch support.', 'TSh 750,000', 3)
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  price_display = excluded.price_display,
  display_order = excluded.display_order,
  updated_at = now();

alter table public.mentorship_packages enable row level security;
grant select on public.mentorship_packages to authenticated;
create policy "Authenticated users can view active mentorship packages" on public.mentorship_packages
for select to authenticated using (is_active or public.is_admin());

alter table public.mentorship_applications add column if not exists mentorship_package_id uuid references public.mentorship_packages(id);
alter table public.mentorship_applications add column if not exists learner_message text;
alter table public.mentorship_applications add column if not exists updated_at timestamptz not null default now();

update public.mentorship_applications application
set mentorship_package_id = package.id
from public.mentorship_packages package
where application.mentorship_package_id is null
  and package.slug = case application.package_name
    when 'Regular' then 'regular-class'
    when 'Advanced' then 'advanced-class'
    when 'Masterclass' then 'master-class'
    else null
  end;

alter table public.mentorship_applications alter column mentorship_package_id set not null;
alter table public.mentorship_applications rename column whatsapp to whatsapp_number;
alter table public.mentorship_applications drop column if exists package_name;
alter table public.mentorship_applications drop constraint if exists mentorship_applications_status_check;
update public.mentorship_applications set status = case status
  when 'New' then 'new' when 'Approved' then 'approved' when 'Waiting List' then 'waiting_list' when 'Rejected' then 'rejected' else status end;
alter table public.mentorship_applications alter column status set default 'new';
alter table public.mentorship_applications add constraint mentorship_applications_status_check check (status in ('new', 'approved', 'waiting_list', 'rejected'));

create index if not exists mentorship_applications_package_idx on public.mentorship_applications (mentorship_package_id);
create index if not exists mentorship_applications_status_idx on public.mentorship_applications (status);
create index if not exists mentorship_applications_created_idx on public.mentorship_applications (created_at desc);

drop policy if exists "Users can create own mentorship applications" on public.mentorship_applications;
drop policy if exists "Users can view own mentorship applications" on public.mentorship_applications;
drop policy if exists "Admins can view all mentorship applications" on public.mentorship_applications;
drop policy if exists "Admins can update mentorship applications" on public.mentorship_applications;
create policy "Users can view own mentorship applications" on public.mentorship_applications for select to authenticated using (user_id = auth.uid());
create policy "Admins can view all mentorship applications" on public.mentorship_applications for select to authenticated using (public.is_admin());
create policy "Admins can update mentorship applications" on public.mentorship_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_mentorship_application(
  p_mentorship_package_id uuid, p_full_name text, p_email text, p_whatsapp_number text,
  p_country text, p_experience_level text, p_trading_duration text, p_biggest_challenge text,
  p_learning_goal text, p_preferred_schedule text, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare application_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.mentorship_packages where id = p_mentorship_package_id and is_active for update;
  if not found then raise exception 'This mentorship package is not currently available'; end if;
  if exists (select 1 from public.mentorship_applications where user_id = auth.uid() and mentorship_package_id = p_mentorship_package_id and status in ('new', 'approved', 'waiting_list')) then
    raise exception 'You already have an active application for this mentorship package';
  end if;
  insert into public.mentorship_applications (user_id, mentorship_package_id, full_name, email, whatsapp_number, country, experience_level, trading_duration, biggest_challenge, learning_goal, preferred_schedule, notes, status)
  values (auth.uid(), p_mentorship_package_id, trim(p_full_name), trim(p_email), trim(p_whatsapp_number), trim(p_country), p_experience_level, trim(p_trading_duration), trim(p_biggest_challenge), trim(p_learning_goal), trim(p_preferred_schedule), nullif(trim(p_notes), ''), 'new')
  returning id into application_id;
  return application_id;
end;
$$;
grant execute on function public.submit_mentorship_application(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

commit;
