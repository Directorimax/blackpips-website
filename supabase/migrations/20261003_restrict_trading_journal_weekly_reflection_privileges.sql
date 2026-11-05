begin;

revoke all privileges
on table public.trading_journal_weekly_reflections
from authenticated;

revoke all privileges
on table public.trading_journal_weekly_reflections
from anon;

grant select, insert, update
on table public.trading_journal_weekly_reflections
to authenticated;

commit;
