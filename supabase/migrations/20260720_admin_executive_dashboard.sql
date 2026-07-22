begin;

create or replace function public.admin_dashboard_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  overview jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  with approved_payments as (
    select p.id, p.user_id, p.course_id, p.amount, p.currency, p.payment_method,
           p.provider, p.transaction_id, p.created_at, p.reviewed_at
    from public.payments as p
    where p.status = 'approved'
  ),
  learner_counts as (
    select
      count(*)::integer as total_learners,
      count(*) filter (
        where exists (
          select 1
          from public.lesson_progress as lp
          where lp.user_id = au.id
            and coalesce(lp.last_viewed_at, lp.completed_at) >= now() - interval '30 days'
        )
      )::integer as active_learners
    from auth.users as au
    left join public.profiles as pr on pr.id = au.id
    where coalesce(pr.role, 'student') <> 'admin'
  ),
  summary as (
    select jsonb_build_object(
      'total_revenue', coalesce((select sum(ap.amount) from approved_payments as ap), 0)::numeric,
      'revenue_this_month', coalesce((
        select sum(ap.amount)
        from approved_payments as ap
        where coalesce(ap.reviewed_at, ap.created_at) >= date_trunc('month', now())
      ), 0)::numeric,
      'total_learners', (select lc.total_learners from learner_counts as lc),
      'active_learners', (select lc.active_learners from learner_counts as lc),
      'pending_payments', (select count(*)::integer from public.payments as p where p.status = 'pending'),
      'pending_mentorship_applications', (select count(*)::integer from public.mentorship_applications as ma where ma.status = 'pending'),
      'published_courses', (select count(*)::integer from public.courses as c),
      'published_lessons', (select count(*)::integer from public.lessons as l where l.is_published = true)
    ) as value
  ),
  months as (
    select generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    )::timestamptz as month_start
  ),
  monthly_totals as (
    select
      m.month_start,
      coalesce(sum(ap.amount), 0)::numeric as revenue
    from months as m
    left join approved_payments as ap
      on coalesce(ap.reviewed_at, ap.created_at) >= m.month_start
      and coalesce(ap.reviewed_at, ap.created_at) < m.month_start + interval '1 month'
    group by m.month_start
  ),
  monthly_revenue as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'month', to_char(mt.month_start, 'Mon'),
      'month_start', mt.month_start,
      'revenue', mt.revenue
    ) order by mt.month_start), '[]'::jsonb) as value
    from monthly_totals as mt
  ),
  top_courses as (
    select coalesce(jsonb_agg(row_to_json(course_data)::jsonb order by course_data.revenue desc, course_data.purchases desc), '[]'::jsonb) as value
    from (
      select
        c.id::uuid as course_id,
        c.title::text as course_name,
        count(distinct pu.id)::integer as purchases,
        coalesce(sum(pu.amount), 0)::numeric as revenue,
        case
          when count(distinct pu.id) = 0 or count(distinct l.id) = 0 then 0
          else round(
            (count(lp.lesson_id) filter (where lp.is_completed = true))::numeric
            / (count(distinct pu.id)::numeric * count(distinct l.id)::numeric) * 100
          )::integer
        end as completion_percentage
      from public.courses as c
      left join public.purchases as pu on pu.course_id = c.id
      left join public.lessons as l on l.course_id = c.id and l.is_published = true
      left join public.lesson_progress as lp
        on lp.course_id = c.id
        and lp.lesson_id = l.id
        and lp.user_id = pu.user_id
      group by c.id, c.title
      order by revenue desc, purchases desc, c.title
      limit 5
    ) as course_data
  ),
  most_active_students as (
    select coalesce(jsonb_agg(row_to_json(student_data)::jsonb order by student_data.last_activity desc), '[]'::jsonb) as value
    from (
      select
        au.id::uuid as student_id,
        coalesce(pr.full_name, au.email)::text as display_name,
        au.email::text as email,
        max(coalesce(lp.last_viewed_at, lp.completed_at))::timestamptz as last_activity,
        count(distinct lp.lesson_id)::integer as lessons_touched
      from public.lesson_progress as lp
      join auth.users as au on au.id = lp.user_id
      left join public.profiles as pr on pr.id = au.id
      where coalesce(pr.role, 'student') <> 'admin'
      group by au.id, pr.full_name, au.email
      order by last_activity desc
      limit 5
    ) as student_data
  ),
  recent_learners as (
    select coalesce(jsonb_agg(row_to_json(student_data)::jsonb order by student_data.joined_at desc), '[]'::jsonb) as value
    from (
      select
        au.id::uuid as student_id,
        coalesce(pr.full_name, au.email)::text as display_name,
        au.email::text as email,
        au.created_at::timestamptz as joined_at
      from auth.users as au
      left join public.profiles as pr on pr.id = au.id
      where coalesce(pr.role, 'student') <> 'admin'
      order by au.created_at desc
      limit 5
    ) as student_data
  ),
  completion_leaderboard as (
    select coalesce(jsonb_agg(row_to_json(student_data)::jsonb order by student_data.completion_percentage desc, student_data.completed_lessons desc), '[]'::jsonb) as value
    from (
      with learner_courses as (
        select distinct pu.user_id, pu.course_id
        from public.purchases as pu
      ), learner_progress as (
        select
          lc.user_id,
          count(distinct l.id)::integer as total_lessons,
          (count(distinct lp.lesson_id) filter (where lp.is_completed = true))::integer as completed_lessons
        from learner_courses as lc
        left join public.lessons as l on l.course_id = lc.course_id and l.is_published = true
        left join public.lesson_progress as lp
          on lp.user_id = lc.user_id and lp.course_id = lc.course_id and lp.lesson_id = l.id
        group by lc.user_id
      )
      select
        au.id::uuid as student_id,
        coalesce(pr.full_name, au.email)::text as display_name,
        coalesce(progress.completed_lessons, 0)::integer as completed_lessons,
        coalesce(progress.total_lessons, 0)::integer as total_lessons,
        case when coalesce(progress.total_lessons, 0) > 0
          then round(progress.completed_lessons::numeric / progress.total_lessons::numeric * 100)::integer
          else 0
        end as completion_percentage
      from learner_progress as progress
      join auth.users as au on au.id = progress.user_id
      left join public.profiles as pr on pr.id = au.id
      where coalesce(pr.role, 'student') <> 'admin'
      order by completion_percentage desc, completed_lessons desc
      limit 5
    ) as student_data
  ),
  recent_lesson_activity as (
    select coalesce(jsonb_agg(row_to_json(activity_data)::jsonb order by activity_data.activity_at desc), '[]'::jsonb) as value
    from (
      select
        lp.id::uuid as progress_id,
        coalesce(pr.full_name, au.email)::text as display_name,
        l.title::text as lesson_title,
        c.title::text as course_name,
        coalesce(lp.last_viewed_at, lp.completed_at)::timestamptz as activity_at,
        lp.is_completed::boolean as is_completed
      from public.lesson_progress as lp
      join auth.users as au on au.id = lp.user_id
      left join public.profiles as pr on pr.id = au.id
      join public.lessons as l on l.id = lp.lesson_id
      join public.courses as c on c.id = lp.course_id
      where coalesce(pr.role, 'student') <> 'admin'
      order by coalesce(lp.last_viewed_at, lp.completed_at) desc
      limit 6
    ) as activity_data
  ),
  recent_payments as (
    select coalesce(jsonb_agg(row_to_json(payment_data)::jsonb order by payment_data.created_at desc), '[]'::jsonb) as value
    from (
      select
        p.id::uuid as payment_id,
        coalesce(pr.full_name, au.email)::text as display_name,
        c.title::text as course_name,
        p.amount::numeric as amount,
        p.currency::text as currency,
        p.status::text as status,
        p.created_at::timestamptz as created_at
      from public.payments as p
      join auth.users as au on au.id = p.user_id
      left join public.profiles as pr on pr.id = au.id
      join public.courses as c on c.id = p.course_id
      order by p.created_at desc
      limit 5
    ) as payment_data
  ),
  recent_applications as (
    select coalesce(jsonb_agg(row_to_json(application_data)::jsonb order by application_data.created_at desc), '[]'::jsonb) as value
    from (
      select
        ma.id::uuid as application_id,
        ma.full_name::text as display_name,
        mp.name::text as package_name,
        ma.status::text as status,
        ma.created_at::timestamptz as created_at
      from public.mentorship_applications as ma
      join public.mentorship_packages as mp on mp.id = ma.mentorship_package_id
      order by ma.created_at desc
      limit 5
    ) as application_data
  ),
  recent_purchases as (
    select coalesce(jsonb_agg(row_to_json(purchase_data)::jsonb order by purchase_data.created_at desc), '[]'::jsonb) as value
    from (
      select
        pu.id::uuid as purchase_id,
        coalesce(pr.full_name, au.email)::text as display_name,
        c.title::text as course_name,
        pu.amount::numeric as amount,
        pu.created_at::timestamptz as created_at
      from public.purchases as pu
      join auth.users as au on au.id = pu.user_id
      left join public.profiles as pr on pr.id = au.id
      join public.courses as c on c.id = pu.course_id
      order by pu.created_at desc
      limit 5
    ) as purchase_data
  )
  select jsonb_build_object(
    'summary', (select s.value from summary as s),
    'monthly_revenue', (select mr.value from monthly_revenue as mr),
    'top_courses', (select tc.value from top_courses as tc),
    'most_active_students', (select mas.value from most_active_students as mas),
    'recent_learners', (select rl.value from recent_learners as rl),
    'completion_leaderboard', (select cl.value from completion_leaderboard as cl),
    'recent_lesson_activity', (select rla.value from recent_lesson_activity as rla),
    'recent_payments', (select rp.value from recent_payments as rp),
    'recent_applications', (select ra.value from recent_applications as ra),
    'recent_purchases', (select rpu.value from recent_purchases as rpu)
  ) into overview;

  return overview;
end;
$$;

revoke all on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;

commit;
