begin;

create table if not exists public.mentorship_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  price_display text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.mentorship_packages (slug, name, short_description, price_display, is_active, display_order)
values
  ('regular-class', 'Regular Class', 'Live foundations coaching and direct mentor support.', 'TSh 250,000', true, 1),
  ('advanced-class', 'Advanced Class', 'Advanced execution coaching, market analysis and accountability.', 'TSh 500,000', true, 2),
  ('master-class', 'Master Class', 'Complete ALC mentorship with direct high-touch support.', 'TSh 750,000', true, 3)
on conflict (slug) do nothing;

alter table public.mentorship_packages enable row level security;
grant select on public.mentorship_packages to anon, authenticated;
drop policy if exists "Authenticated users can view active mentorship packages" on public.mentorship_packages;
drop policy if exists "Public users can view active mentorship packages" on public.mentorship_packages;
create policy "Public users can view active mentorship packages" on public.mentorship_packages
for select to anon, authenticated using (is_active or public.is_admin());

commit;
