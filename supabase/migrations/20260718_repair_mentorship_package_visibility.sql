begin;

insert into public.mentorship_packages (slug, name, short_description, price_display, is_active, display_order)
values
  ('regular-class', 'Regular Class', 'Live foundations coaching and direct mentor support.', 'TSh 250,000', true, 1),
  ('advanced-class', 'Advanced Class', 'Advanced execution coaching, market analysis and accountability.', 'TSh 500,000', true, 2),
  ('master-class', 'Master Class', 'Complete ALC mentorship with direct high-touch support.', 'TSh 750,000', true, 3)
on conflict (slug) do nothing;

grant select on public.mentorship_packages to anon, authenticated;
drop policy if exists "Authenticated users can view active mentorship packages" on public.mentorship_packages;
drop policy if exists "Public users can view active mentorship packages" on public.mentorship_packages;
create policy "Public users can view active mentorship packages" on public.mentorship_packages
for select to anon, authenticated using (is_active or public.is_admin());

commit;
