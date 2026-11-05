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
  ('10000000-0000-0000-0000-000000000001', 'learner-one@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'learner-two@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'learner-three@example.test');

insert into public.courses (id, slug, title, price) values
  ('20000000-0000-0000-0000-000000000001', 'owned-course', 'Owned course', 1),
  ('20000000-0000-0000-0000-000000000002', 'other-course', 'Other course', 1);

insert into public.lessons (id, course_id, title, is_published) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Published lesson', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Other lesson', true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Draft lesson', false);

insert into public.purchases (id, user_id, course_id, payment_status) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'approved'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'approved');

do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.record_learning_activity(
      '50000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      60,
      'UTC',
      current_date
    );
    raise exception 'Unauthenticated recording unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select pg_temp.assert_true(
  public.record_learning_activity(
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    60,
    'UTC',
    current_date
  ),
  'entitled learner can record valid activity'
);

select pg_temp.assert_true(
  not public.record_learning_activity(
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    60,
    'UTC',
    current_date
  ),
  'duplicate event UUID is idempotent'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.learning_activity_events where id = '50000000-0000-0000-0000-000000000002'),
  'duplicate event is stored once'
);

do $$
begin
  begin
    perform public.record_learning_activity(
      '50000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000002',
      60,
      'UTC',
      current_date
    );
    raise exception 'Unowned course recording unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.record_learning_activity(
      '50000000-0000-0000-0000-000000000004',
      '20000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000001',
      60,
      'UTC',
      current_date
    );
    raise exception 'Invalid lesson/course pair unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.record_learning_activity(
      '50000000-0000-0000-0000-000000000005',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      0,
      'UTC',
      current_date
    );
    raise exception 'Zero-second activity unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.record_learning_activity(
      '50000000-0000-0000-0000-000000000006',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      301,
      'UTC',
      current_date
    );
    raise exception 'Oversized activity unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    insert into public.learning_activity_events (
      id, user_id, course_id, lesson_id, activity_date, active_seconds, timezone
    ) values (
      '50000000-0000-0000-0000-000000000007',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      current_date,
      10,
      'UTC'
    );
    raise exception 'Direct authenticated insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.learning_activity_events
    set active_seconds = 20
    where id = '50000000-0000-0000-0000-000000000002';
    raise exception 'Direct authenticated update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.learning_activity_events
    where id = '50000000-0000-0000-0000-000000000002';
    raise exception 'Direct authenticated delete unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
declare
  monday date := current_date - (extract(isodow from current_date)::integer - 1);
begin
  insert into public.learning_activity_events (
    id, user_id, course_id, lesson_id, activity_date, active_seconds, timezone
  ) values
    ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', monday, 60, 'UTC'),
    ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', monday + 1, 120, 'UTC'),
    ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', monday + 6, 30, 'UTC'),
    ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', current_date - 1, 15, 'UTC')
  on conflict (id) do nothing;

  insert into public.lesson_progress (
    id, user_id, course_id, lesson_id, completed_at, is_completed
  ) values (
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    monday + interval '12 hours',
    true
  );
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

select pg_temp.assert_true(
  summary.weekly_total_seconds = 210,
  'weekly aggregation sums Monday through Sunday'
)
from public.get_learning_activity_summary('UTC', null) as summary;

select pg_temp.assert_true(
  summary.active_days = 3,
  'active-day count uses dates with positive recorded activity'
)
from public.get_learning_activity_summary('UTC', null) as summary;

select pg_temp.assert_true(
  jsonb_array_length(summary.daily_activity) = 7
  and (summary.daily_activity->0->>'activity_date')::date = summary.week_start
  and (summary.daily_activity->6->>'activity_date')::date = summary.week_end,
  'daily output is an ordered Monday-through-Sunday series'
)
from public.get_learning_activity_summary('UTC', null) as summary;

select pg_temp.assert_true(
  summary.lessons_completed_this_week = 1,
  'weekly lesson completions remain sourced from lesson_progress'
)
from public.get_learning_activity_summary('UTC', null) as summary;

select pg_temp.assert_true(
  (select count(*) = 3 from public.learning_activity_events),
  'learner sees only their own activity rows through RLS'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true(
  summary.current_streak_days >= 2,
  'today and yesterday form a current streak'
)
from public.get_learning_activity_summary('UTC', null) as summary;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true(
  (select count(*) = 0 from public.learning_activity_events),
  'one learner cannot read another learner activity'
);

do $$
begin
  begin
    perform public.record_learning_activity(
      '80000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      60,
      'UTC',
      current_date
    );
    raise exception 'Unentitled learner unexpectedly recorded activity';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
