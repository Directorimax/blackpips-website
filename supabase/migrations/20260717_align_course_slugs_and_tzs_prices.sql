begin;

-- Free the target slugs first so the two records that currently share the
-- eight-entries value cannot cause a transient unique-constraint violation.
update public.courses
set slug = concat('__blackpips_slug_migration_', id::text)
where title in ('Regular ALC', 'Advanced ALC', 'ALC Masterclass', 'Eight Entries');

update public.courses
set slug = 'alc-foundations', price = 100000
where title = 'Regular ALC';

update public.courses
set slug = 'liquidity-engine', price = 250000
where title = 'Advanced ALC';

update public.courses
set slug = 'eight-entries', price = 500000
where title = 'ALC Masterclass';

update public.courses
set slug = 'xauusd-mastery', price = 200000
where title = 'Eight Entries';

commit;
