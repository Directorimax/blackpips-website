begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('71000000-0000-0000-0000-000000000001', 'gift-owner-a@example.test'),
  ('71000000-0000-0000-0000-000000000002', 'gift-owner-b@example.test');

insert into public.user_gift_claims (id, user_id, gift_id, claimed_at) values
  (
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'gift-a',
    '2026-09-01 00:00:00+00'
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000002',
    'gift-b',
    '2026-09-02 00:00:00+00'
  );

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform public.mark_welcome_gift_viewed('gift-a');
    raise exception 'Anonymous viewed-state mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000001',
  true
);

create temporary table first_view_result as
select public.mark_welcome_gift_viewed('gift-a') as first_viewed_at;

select pg_temp.assert_true(
  (select first_viewed_at is not null from first_view_result),
  'owner can mark an existing claimed gift viewed'
);

select pg_temp.assert_true(
  public.mark_welcome_gift_viewed('gift-a') =
    (select first_viewed_at from first_view_result),
  'repeated calls preserve the original first-view timestamp'
);

do $$
begin
  begin
    perform public.mark_welcome_gift_viewed('gift-b');
    raise exception 'Cross-user gift mutation unexpectedly succeeded';
  exception when no_data_found then null;
  end;

  begin
    perform public.mark_welcome_gift_viewed('missing-gift');
    raise exception 'Nonexistent gift mutation unexpectedly succeeded';
  exception when no_data_found then null;
  end;
end;
$$;

reset role;

select pg_temp.assert_true(
  (
    select first_viewed_at is null
    from public.user_gift_claims
    where id = '72000000-0000-0000-0000-000000000002'
  ),
  'user A cannot mark user B gift viewed'
);

select pg_temp.assert_true(
  (
    select id = '72000000-0000-0000-0000-000000000001'
      and user_id = '71000000-0000-0000-0000-000000000001'
      and gift_id = 'gift-a'
      and claimed_at = '2026-09-01 00:00:00+00'::timestamptz
    from public.user_gift_claims
    where id = '72000000-0000-0000-0000-000000000001'
  ),
  'RPC cannot modify claim identity or claimed_at'
);

do $$
begin
  begin
    insert into public.user_gift_claims (user_id, gift_id)
    values ('71000000-0000-0000-0000-000000000001', 'gift-a');
    raise exception 'Duplicate claim unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

rollback;
