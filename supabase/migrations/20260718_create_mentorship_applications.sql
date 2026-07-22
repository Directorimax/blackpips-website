begin;

create table if not exists public.mentorship_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_name text not null,
  full_name text not null,
  email text not null,
  whatsapp text not null,
  country text not null,
  experience_level text not null check (experience_level in ('Beginner', 'Intermediate', 'Advanced')),
  trading_duration text not null,
  biggest_challenge text not null,
  learning_goal text not null,
  preferred_schedule text not null,
  notes text,
  status text not null default 'New' check (status in ('New', 'Approved', 'Waiting List', 'Rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists mentorship_applications_user_created_idx
  on public.mentorship_applications (user_id, created_at desc);
create index if not exists mentorship_applications_status_created_idx
  on public.mentorship_applications (status, created_at desc);

grant select, insert, update on public.mentorship_applications to authenticated;
alter table public.mentorship_applications enable row level security;

create policy "Users can create own mentorship applications" on public.mentorship_applications
for insert to authenticated with check (user_id = auth.uid());

create policy "Users can view own mentorship applications" on public.mentorship_applications
for select to authenticated using (user_id = auth.uid());

create policy "Admins can view all mentorship applications" on public.mentorship_applications
for select to authenticated using (public.is_admin());

create policy "Admins can update mentorship applications" on public.mentorship_applications
for update to authenticated using (public.is_admin()) with check (public.is_admin());

commit;
