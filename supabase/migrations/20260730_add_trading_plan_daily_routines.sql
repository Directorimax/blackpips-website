begin;

alter table public.trading_plans
  add column if not exists daily_routine_before text,
  add column if not exists daily_routine_during text,
  add column if not exists daily_routine_after text;

commit;
