begin;

create table if not exists public.trading_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  market_type text not null,
  direction text not null,
  timeframe text not null,
  strategy text not null,
  session text not null,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  lot_size numeric not null,
  risk_percent numeric,
  reward_percent numeric,
  risk_reward_ratio numeric,
  result text not null,
  profit_loss numeric,
  emotion_before text,
  emotion_after text,
  confidence smallint,
  mistakes text,
  lessons text,
  notes text,
  -- Private Storage object keys, not signed or public URLs.
  before_image_url text,
  after_image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trading_journal_entries_pair_check check (char_length(btrim(pair)) between 1 and 24),
  constraint trading_journal_entries_market_type_check check (market_type in ('forex', 'metals', 'indices', 'energy', 'crypto', 'other')),
  constraint trading_journal_entries_direction_check check (direction in ('long', 'short')),
  constraint trading_journal_entries_session_check check (session in ('asian', 'london', 'new_york', 'london_new_york_overlap', 'other')),
  constraint trading_journal_entries_result_check check (result in ('win', 'loss', 'breakeven')),
  constraint trading_journal_entries_lot_size_check check (lot_size > 0),
  constraint trading_journal_entries_prices_check check (
    (entry_price is null or entry_price >= 0)
    and (stop_loss is null or stop_loss >= 0)
    and (take_profit is null or take_profit >= 0)
    and (exit_price is null or exit_price >= 0)
  ),
  constraint trading_journal_entries_percentages_check check (
    (risk_percent is null or risk_percent >= 0)
    and (reward_percent is null or reward_percent >= 0)
    and (risk_reward_ratio is null or risk_reward_ratio >= 0)
  ),
  constraint trading_journal_entries_confidence_check check (confidence is null or confidence between 1 and 5)
);

create index if not exists trading_journal_entries_user_created_at_idx
  on public.trading_journal_entries (user_id, created_at desc);
create index if not exists trading_journal_entries_user_pair_idx
  on public.trading_journal_entries (user_id, pair);
create index if not exists trading_journal_entries_user_result_idx
  on public.trading_journal_entries (user_id, result);

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_trading_journal_entries_updated_at on public.trading_journal_entries;
create trigger set_trading_journal_entries_updated_at
  before update on public.trading_journal_entries
  for each row execute function public.tg_set_updated_at();

alter table public.trading_journal_entries enable row level security;

revoke all on public.trading_journal_entries from anon;
grant select, insert, update, delete on public.trading_journal_entries to authenticated;

drop policy if exists "Users manage own trading journal entries" on public.trading_journal_entries;
drop policy if exists "Users read own trading journal entries" on public.trading_journal_entries;
drop policy if exists "Users create own trading journal entries" on public.trading_journal_entries;
drop policy if exists "Users update own trading journal entries" on public.trading_journal_entries;
drop policy if exists "Users delete own trading journal entries" on public.trading_journal_entries;
drop policy if exists "Admins read all trading journal entries" on public.trading_journal_entries;
drop policy if exists "Admins update all trading journal entries" on public.trading_journal_entries;
drop policy if exists "Admins delete all trading journal entries" on public.trading_journal_entries;

create policy "Users read own trading journal entries" on public.trading_journal_entries
  for select to authenticated using (user_id = auth.uid());
create policy "Users create own trading journal entries" on public.trading_journal_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own trading journal entries" on public.trading_journal_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own trading journal entries" on public.trading_journal_entries
  for delete to authenticated using (user_id = auth.uid());
create policy "Admins read all trading journal entries" on public.trading_journal_entries
  for select to authenticated using (public.is_admin());
create policy "Admins update all trading journal entries" on public.trading_journal_entries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete all trading journal entries" on public.trading_journal_entries
  for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trading-journal-screenshots',
  'trading-journal-screenshots',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users upload own trading journal screenshots" on storage.objects;
drop policy if exists "Users read own trading journal screenshots" on storage.objects;
drop policy if exists "Users update own trading journal screenshots" on storage.objects;
drop policy if exists "Users delete own trading journal screenshots" on storage.objects;
drop policy if exists "Admins read trading journal screenshots" on storage.objects;
drop policy if exists "Admins update trading journal screenshots" on storage.objects;
drop policy if exists "Admins delete trading journal screenshots" on storage.objects;

create policy "Users upload own trading journal screenshots" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trading-journal-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users read own trading journal screenshots" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trading-journal-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users update own trading journal screenshots" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'trading-journal-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'trading-journal-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users delete own trading journal screenshots" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trading-journal-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Admins read trading journal screenshots" on storage.objects
  for select to authenticated
  using (bucket_id = 'trading-journal-screenshots' and public.is_admin());
create policy "Admins update trading journal screenshots" on storage.objects
  for update to authenticated
  using (bucket_id = 'trading-journal-screenshots' and public.is_admin())
  with check (bucket_id = 'trading-journal-screenshots' and public.is_admin());
create policy "Admins delete trading journal screenshots" on storage.objects
  for delete to authenticated
  using (bucket_id = 'trading-journal-screenshots' and public.is_admin());

commit;
