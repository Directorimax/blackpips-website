begin;

create table if not exists public.trading_journal_weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  went_well text not null default '',
  went_wrong text not null default '',
  improve_next_week text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trading_journal_weekly_reflections_user_week_unique
    unique (user_id, week_start),
  constraint trading_journal_weekly_reflections_monday_check
    check (extract(isodow from week_start) = 1),
  constraint trading_journal_weekly_reflections_lengths_check check (
    char_length(went_well) <= 2000
    and char_length(went_wrong) <= 2000
    and char_length(improve_next_week) <= 2000
  )
);

create index if not exists trading_journal_weekly_reflections_user_week_idx
  on public.trading_journal_weekly_reflections (user_id, week_start desc);

drop trigger if exists set_trading_journal_weekly_reflections_updated_at
  on public.trading_journal_weekly_reflections;
create trigger set_trading_journal_weekly_reflections_updated_at
  before update on public.trading_journal_weekly_reflections
  for each row execute function public.tg_set_updated_at();

alter table public.trading_journal_weekly_reflections enable row level security;

revoke all on public.trading_journal_weekly_reflections from anon;
grant select, insert, update on public.trading_journal_weekly_reflections
  to authenticated;

create policy "Users read own weekly reflections"
  on public.trading_journal_weekly_reflections
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users create own weekly reflections"
  on public.trading_journal_weekly_reflections
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users update own weekly reflections"
  on public.trading_journal_weekly_reflections
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
