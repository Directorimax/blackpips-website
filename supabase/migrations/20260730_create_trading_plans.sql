begin;

create table if not exists public.trading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  trader_name text not null,
  trading_style text not null,
  preferred_market text not null,
  preferred_session text not null,
  preferred_timeframes text[] not null default '{}',
  max_risk_per_trade numeric not null,
  max_daily_loss numeric not null,
  max_weekly_loss numeric not null,
  max_open_trades integer not null,
  psychology_rules text,
  daily_routine text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trading_plans_risk_check check (max_risk_per_trade >= 0 and max_risk_per_trade <= 100),
  constraint trading_plans_daily_loss_check check (max_daily_loss >= 0 and max_daily_loss <= 100),
  constraint trading_plans_weekly_loss_check check (max_weekly_loss >= 0 and max_weekly_loss <= 100),
  constraint trading_plans_open_trades_check check (max_open_trades between 1 and 100)
);

create index if not exists trading_plans_user_id_idx on public.trading_plans (user_id);

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_trading_plans_updated_at on public.trading_plans;
create trigger set_trading_plans_updated_at before update on public.trading_plans
for each row execute function public.tg_set_updated_at();

alter table public.trading_plans enable row level security;
revoke all on public.trading_plans from anon;
grant select, insert, update on public.trading_plans to authenticated;

drop policy if exists "Users manage own trading plan" on public.trading_plans;
drop policy if exists "Users read own trading plan" on public.trading_plans;
drop policy if exists "Users create own trading plan" on public.trading_plans;
drop policy if exists "Users update own trading plan" on public.trading_plans;
create policy "Users read own trading plan" on public.trading_plans for select to authenticated using (user_id = auth.uid());
create policy "Users create own trading plan" on public.trading_plans for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own trading plan" on public.trading_plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
