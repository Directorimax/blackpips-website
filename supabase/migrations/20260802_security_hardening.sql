begin;

-- Browser upload checks are advisory. Bucket limits enforce type and size at the backend.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'payment-proofs';

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'profile-images';

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'trading-journal-screenshots';

-- Defense in depth for user-owned records, in addition to server-side Zod validation.
alter table public.trading_journal_entries
  drop constraint if exists trading_journal_text_lengths_check,
  add constraint trading_journal_text_lengths_check check (
    char_length(timeframe) between 1 and 32
    and char_length(strategy) between 1 and 120
    and coalesce(char_length(emotion_before), 0) <= 5000
    and coalesce(char_length(emotion_after), 0) <= 5000
    and coalesce(char_length(mistakes), 0) <= 5000
    and coalesce(char_length(lessons), 0) <= 5000
    and coalesce(char_length(notes), 0) <= 5000
    and cardinality(tags) <= 20
  ) not valid;

alter table public.trading_plans
  drop constraint if exists trading_plans_text_lengths_check,
  add constraint trading_plans_text_lengths_check check (
    char_length(trader_name) between 1 and 120
    and char_length(trading_style) between 1 and 80
    and char_length(preferred_market) between 1 and 80
    and char_length(preferred_session) between 1 and 80
    and coalesce(char_length(psychology_rules), 0) <= 5000
    and coalesce(char_length(daily_routine), 0) <= 5000
    and coalesce(char_length(notes), 0) <= 5000
  ) not valid;

-- Every admin RPC remains callable only by authenticated users and still performs
-- its own public.is_admin() check before touching privileged data.
do $block$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon', fn.signature);
    execute format('grant execute on function %s to authenticated', fn.signature);
  end loop;
end
$block$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

commit;
