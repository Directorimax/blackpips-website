begin;

alter table public.trading_plans
  add column if not exists preferred_markets text[] not null default '{}',
  add column if not exists preferred_sessions text[] not null default '{}',
  add column if not exists psychology_rules_list text[] not null default '{}';

update public.trading_plans as plan
set
  preferred_markets = case
    when coalesce(array_length(plan.preferred_markets, 1), 0) = 0
      and nullif(btrim(plan.preferred_market), '') is not null
      then array[plan.preferred_market]
    else coalesce(plan.preferred_markets, '{}')
  end,
  preferred_sessions = case
    when coalesce(array_length(plan.preferred_sessions, 1), 0) = 0
      and nullif(btrim(plan.preferred_session), '') is not null
      then array[plan.preferred_session]
    else coalesce(plan.preferred_sessions, '{}')
  end,
  psychology_rules_list = case
    when coalesce(array_length(plan.psychology_rules_list, 1), 0) = 0
      and nullif(btrim(plan.psychology_rules), '') is not null
      then array(
        select btrim(rule)
        from unnest(regexp_split_to_array(plan.psychology_rules, E'\\r?\\n')) as rule
        where nullif(btrim(rule), '') is not null
      )
    else coalesce(plan.psychology_rules_list, '{}')
  end;

commit;
