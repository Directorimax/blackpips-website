begin;

create table public.learning_activity_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  activity_date date not null,
  active_seconds integer not null,
  timezone text not null,
  recorded_at timestamptz not null default now(),
  constraint learning_activity_events_active_seconds_check
    check (active_seconds between 1 and 300),
  constraint learning_activity_events_timezone_length_check
    check (char_length(timezone) between 1 and 64)
);

create index learning_activity_events_user_activity_date_idx
  on public.learning_activity_events (user_id, activity_date);
create index learning_activity_events_user_recorded_at_idx
  on public.learning_activity_events (user_id, recorded_at);
create index learning_activity_events_user_lesson_date_idx
  on public.learning_activity_events (user_id, lesson_id, activity_date);

alter table public.learning_activity_events enable row level security;

revoke all on table public.learning_activity_events from public, anon, authenticated;
grant select on table public.learning_activity_events to authenticated;

create policy "Learners read own learning activity"
on public.learning_activity_events
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.record_learning_activity(
  p_event_id uuid,
  p_course_id uuid,
  p_lesson_id uuid,
  p_active_seconds integer,
  p_timezone text,
  p_activity_date date
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  normalized_timezone text := btrim(p_timezone);
  local_today date;
  inserted boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_event_id is null or p_course_id is null or p_lesson_id is null then
    raise exception 'Event, course, and lesson are required' using errcode = '22004';
  end if;
  if p_active_seconds is null or p_active_seconds < 1 or p_active_seconds > 300 then
    raise exception 'Active seconds must be between 1 and 300' using errcode = '22023';
  end if;
  if normalized_timezone is null
     or char_length(normalized_timezone) < 1
     or char_length(normalized_timezone) > 64
     or not exists (
       select 1 from pg_catalog.pg_timezone_names
       where name = normalized_timezone
     ) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;

  local_today := (statement_timestamp() at time zone normalized_timezone)::date;
  if p_activity_date is null
     or p_activity_date > local_today
     or p_activity_date < local_today - 7 then
    raise exception 'Activity date is outside the accepted recording window'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.lessons as lesson
    where lesson.id = p_lesson_id
      and lesson.course_id = p_course_id
      and lesson.is_published = true
  ) then
    raise exception 'Lesson is unavailable for this course' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.purchases as purchase
    where purchase.user_id = caller_id
      and purchase.course_id = p_course_id
  ) then
    raise exception 'Course access required' using errcode = '42501';
  end if;

  insert into public.learning_activity_events (
    id,
    user_id,
    course_id,
    lesson_id,
    activity_date,
    active_seconds,
    timezone
  ) values (
    p_event_id,
    caller_id,
    p_course_id,
    p_lesson_id,
    p_activity_date,
    p_active_seconds,
    normalized_timezone
  )
  on conflict (id) do nothing;

  inserted := found;
  return inserted;
end;
$$;

create or replace function public.get_learning_activity_summary(
  p_timezone text,
  p_week_start date default null
)
returns table (
  week_start date,
  week_end date,
  timezone text,
  daily_activity jsonb,
  weekly_total_seconds bigint,
  active_days integer,
  current_streak_days integer,
  lessons_completed_this_week integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  normalized_timezone text := btrim(p_timezone);
  local_today date;
  selected_week_start date;
  streak_start date;
  streak_count integer := 0;
  cursor_date date;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if normalized_timezone is null
     or char_length(normalized_timezone) < 1
     or char_length(normalized_timezone) > 64
     or not exists (
       select 1 from pg_catalog.pg_timezone_names
       where name = normalized_timezone
     ) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;

  local_today := (statement_timestamp() at time zone normalized_timezone)::date;
  selected_week_start := coalesce(
    p_week_start,
    local_today - (extract(isodow from local_today)::integer - 1)
  );
  if extract(isodow from selected_week_start)::integer <> 1 then
    raise exception 'Week start must be a Monday' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.learning_activity_events as event
    where event.user_id = caller_id and event.activity_date = local_today
  ) then
    streak_start := local_today;
  else
    streak_start := local_today - 1;
  end if;

  cursor_date := streak_start;
  while exists (
    select 1 from public.learning_activity_events as event
    where event.user_id = caller_id and event.activity_date = cursor_date
  ) loop
    streak_count := streak_count + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return query
  with week_days as (
    select generate_series(
      selected_week_start,
      selected_week_start + 6,
      interval '1 day'
    )::date as activity_date
  ),
  daily_totals as (
    select
      event.activity_date,
      sum(event.active_seconds)::bigint as active_seconds
    from public.learning_activity_events as event
    where event.user_id = caller_id
      and event.activity_date between selected_week_start and selected_week_start + 6
    group by event.activity_date
  )
  select
    selected_week_start,
    selected_week_start + 6,
    normalized_timezone,
    jsonb_agg(
      jsonb_build_object(
        'activity_date', day.activity_date,
        'active_seconds', coalesce(total.active_seconds, 0)
      )
      order by day.activity_date
    ),
    coalesce(sum(total.active_seconds), 0)::bigint,
    count(*) filter (where coalesce(total.active_seconds, 0) > 0)::integer,
    streak_count,
    (
      select count(distinct progress.lesson_id)::integer
      from public.lesson_progress as progress
      where progress.user_id = caller_id
        and progress.is_completed = true
        and (progress.completed_at at time zone normalized_timezone)::date
          between selected_week_start and selected_week_start + 6
    )
  from week_days as day
  left join daily_totals as total using (activity_date);
end;
$$;

revoke all on function public.record_learning_activity(uuid, uuid, uuid, integer, text, date)
  from public, anon, service_role;
grant execute on function public.record_learning_activity(uuid, uuid, uuid, integer, text, date)
  to authenticated;

revoke all on function public.get_learning_activity_summary(text, date)
  from public, anon, service_role;
grant execute on function public.get_learning_activity_summary(text, date)
  to authenticated;

commit;
