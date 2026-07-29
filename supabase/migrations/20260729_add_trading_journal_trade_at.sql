begin;

alter table public.trading_journal_entries
  add column if not exists trade_at timestamptz not null default now();

create index if not exists trading_journal_entries_user_trade_at_idx
  on public.trading_journal_entries (user_id, trade_at desc);

commit;
