begin;

alter table public.trading_journal_entries
  add column if not exists plan_compliance_snapshot jsonb;

alter table public.trading_journal_entries
  drop constraint if exists trading_journal_entries_plan_compliance_object_check;

alter table public.trading_journal_entries
  add constraint trading_journal_entries_plan_compliance_object_check
  check (
    plan_compliance_snapshot is null
    or jsonb_typeof(plan_compliance_snapshot) = 'object'
  );

revoke all privileges on table public.trading_journal_entries
  from anon, authenticated;

grant select, insert, update, delete
  on table public.trading_journal_entries
  to authenticated;

commit;
