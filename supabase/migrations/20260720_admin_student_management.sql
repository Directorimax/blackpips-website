begin;

create index if not exists purchases_course_user_idx on public.purchases (course_id, user_id);
create index if not exists mentorship_applications_user_status_created_idx
  on public.mentorship_applications (user_id, status, created_at desc);
create index if not exists lesson_progress_user_course_completed_idx
  on public.lesson_progress (user_id, course_id, is_completed);

create or replace function public.admin_list_students(
  p_search text default null,
  p_course_id uuid default null,
  p_mentorship_status text default null,
  p_learning_state text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  student_id uuid,
  display_name text,
  email text,
  joined_at timestamptz,
  courses_purchased integer,
  active_course_entitlements integer,
  completed_lessons integer,
  total_published_lessons integer,
  last_learning_activity timestamptz,
  mentorship_status text,
  total_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;

  return query
  with learners as (
    select au.id as learner_id, pr.display_name as learner_name, au.email as learner_email, au.created_at as learner_joined_at
    from auth.users as au
    left join public.profiles as pr on pr.id = au.id
    where coalesce(pr.role, 'student') <> 'admin'
  ),
  purchase_summary as (
    select p.user_id as learner_id, count(distinct p.course_id)::integer as purchase_count
    from public.purchases as p
    group by p.user_id
  ),
  entitled_lessons as (
    select p.user_id as learner_id, p.course_id as entitled_course_id, l.id as published_lesson_id
    from public.purchases as p
    join public.lessons as l on l.course_id = p.course_id and l.is_published = true
  ),
  progress_summary as (
    select el.learner_id,
           count(distinct el.published_lesson_id)::integer as published_count,
           (count(distinct lp.lesson_id) filter (where lp.is_completed = true))::integer as completed_count,
           count(distinct lp.lesson_id)::integer as progress_record_count,
           max(coalesce(lp.last_viewed_at, lp.completed_at)) as latest_activity
    from entitled_lessons as el
    left join public.lesson_progress as lp
      on lp.user_id = el.learner_id
      and lp.course_id = el.entitled_course_id
      and lp.lesson_id = el.published_lesson_id
    group by el.learner_id
  ),
  mentorship_summary as (
    select distinct on (ma.user_id) ma.user_id as learner_id, ma.status as latest_status
    from public.mentorship_applications as ma
    order by ma.user_id, ma.created_at desc
  ),
  filtered as (
    select l.learner_id as student_id,
           l.learner_name as display_name,
           l.learner_email as email,
           l.learner_joined_at as joined_at,
           coalesce(ps.purchase_count, 0)::integer as courses_purchased,
           coalesce(ps.purchase_count, 0)::integer as active_course_entitlements,
           coalesce(prs.completed_count, 0)::integer as completed_lessons,
           coalesce(prs.published_count, 0)::integer as total_published_lessons,
           prs.latest_activity as last_learning_activity,
           ms.latest_status::text as mentorship_status,
           case
             when coalesce(prs.progress_record_count, 0) = 0 then 'not_started'
             when coalesce(prs.published_count, 0) > 0 and coalesce(prs.completed_count, 0) >= prs.published_count then 'completed'
             else 'in_progress'
           end as learning_state
    from learners as l
    left join purchase_summary as ps on ps.learner_id = l.learner_id
    left join progress_summary as prs on prs.learner_id = l.learner_id
    left join mentorship_summary as ms on ms.learner_id = l.learner_id
    where (
      coalesce(trim(p_search), '') = ''
      or lower(coalesce(l.learner_name, '') || ' ' || coalesce(l.learner_email, '')) like '%' || lower(trim(p_search)) || '%'
    )
    and (
      p_course_id is null
      or exists (
        select 1 from public.purchases as fp
        where fp.user_id = l.learner_id and fp.course_id = p_course_id
      )
    )
    and (p_mentorship_status is null or p_mentorship_status = 'all' or ms.latest_status = p_mentorship_status)
  )
  select f.student_id, f.display_name, f.email, f.joined_at, f.courses_purchased,
         f.active_course_entitlements, f.completed_lessons, f.total_published_lessons,
         f.last_learning_activity, f.mentorship_status, count(*) over ()::integer as total_count
  from filtered as f
  where (
    p_learning_state is null
    or p_learning_state = 'all'
    or f.learning_state = p_learning_state
  )
  order by f.last_learning_activity desc nulls last, f.joined_at desc
  limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50);
end;
$$;

create or replace function public.admin_get_student_details(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare student_profile jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;

  select jsonb_build_object(
    'id', au.id,
    'display_name', pr.display_name,
    'email', au.email,
    'joined_at', au.created_at,
    'last_active_at', activity.latest_activity
  ) into student_profile
  from auth.users as au
  left join public.profiles as pr on pr.id = au.id
  left join lateral (
    select max(coalesce(lp.last_viewed_at, lp.completed_at)) as latest_activity
    from public.lesson_progress as lp
    where lp.user_id = au.id
  ) as activity on true
  where au.id = p_student_id and coalesce(pr.role, 'student') <> 'admin';

  if student_profile is null then raise exception 'Student not found'; end if;

  return jsonb_build_object(
    'profile', student_profile,
    'purchases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'course_id', c.id,
        'course_title', c.title,
        'purchase_status', p.payment_status,
        'amount', p.amount,
        'currency', coalesce(pay.currency, 'TZS'),
        'approval_date', coalesce(pay.reviewed_at, p.created_at),
        'transaction_id', p.transaction_id
      ) order by p.created_at desc)
      from public.purchases as p
      join public.courses as c on c.id = p.course_id
      left join lateral (
        select py.currency, py.reviewed_at
        from public.payments as py
        where py.user_id = p.user_id
          and py.course_id = p.course_id
          and py.status = 'approved'
        order by py.reviewed_at desc nulls last, py.created_at desc nulls last
        limit 1
      ) as pay on true
      where p.user_id = p_student_id
    ), '[]'::jsonb),
    'course_progress', coalesce((
      with course_progress as (
        select p.course_id, c.title as course_title,
               count(l.id)::integer as total_lessons,
               (count(lp.lesson_id) filter (where lp.is_completed = true))::integer as completed_lessons,
               count(lp.lesson_id)::integer as progress_record_count,
               max(coalesce(lp.last_viewed_at, lp.completed_at)) as last_activity
        from public.purchases as p
        join public.courses as c on c.id = p.course_id
        left join public.lessons as l on l.course_id = p.course_id and l.is_published = true
        left join public.lesson_progress as lp
          on lp.user_id = p.user_id
          and lp.course_id = p.course_id
          and lp.lesson_id = l.id
        where p.user_id = p_student_id
        group by p.course_id, c.title
      )
      select jsonb_agg(jsonb_build_object(
        'course_id', cp.course_id,
        'course_title', cp.course_title,
        'completed_lessons', cp.completed_lessons,
        'total_lessons', cp.total_lessons,
        'percentage', case when cp.total_lessons > 0 then round((cp.completed_lessons::numeric / cp.total_lessons::numeric) * 100)::integer else 0 end,
        'last_viewed_lesson', latest.lesson_title,
        'last_viewed_at', cp.last_activity,
        'state', case
          when cp.progress_record_count = 0 then 'not_started'
          when cp.total_lessons > 0 and cp.completed_lessons >= cp.total_lessons then 'completed'
          else 'in_progress'
        end
      ) order by cp.course_title)
      from course_progress as cp
      left join lateral (
        select l2.title as lesson_title
        from public.lesson_progress as lp2
        join public.lessons as l2 on l2.id = lp2.lesson_id
        where lp2.user_id = p_student_id and lp2.course_id = cp.course_id
        order by coalesce(lp2.last_viewed_at, lp2.completed_at) desc nulls last
        limit 1
      ) as latest on true
    ), '[]'::jsonb),
    'mentorship', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ma.id,
        'package_name', mp.name,
        'application_date', ma.created_at,
        'status', ma.status,
        'decision_date', ma.reviewed_at
      ) order by ma.created_at desc)
      from public.mentorship_applications as ma
      join public.mentorship_packages as mp on mp.id = ma.mentorship_package_id
      where ma.user_id = p_student_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_list_students(text, uuid, text, text, integer, integer) from public;
revoke all on function public.admin_get_student_details(uuid) from public;
grant execute on function public.admin_list_students(text, uuid, text, text, integer, integer) to authenticated;
grant execute on function public.admin_get_student_details(uuid) to authenticated;

commit;
