begin;

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
    select
      au.id::uuid as learner_id,
      pr.full_name::text as learner_name,
      au.email::text as learner_email,
      au.created_at::timestamptz as learner_joined_at
    from auth.users as au
    left join public.profiles as pr on pr.id = au.id
    where coalesce(pr.role, 'student') <> 'admin'
  ),
  purchase_summary as (
    select p.user_id::uuid as learner_id, count(distinct p.course_id)::integer as purchase_count
    from public.purchases as p
    group by p.user_id
  ),
  entitled_lessons as (
    select p.user_id::uuid as learner_id, p.course_id::uuid as entitled_course_id, l.id::uuid as published_lesson_id
    from public.purchases as p
    join public.lessons as l on l.course_id = p.course_id and l.is_published = true
  ),
  progress_summary as (
    select
      el.learner_id::uuid as learner_id,
      count(distinct el.published_lesson_id)::integer as published_count,
      (count(distinct lp.lesson_id) filter (where lp.is_completed = true))::integer as completed_count,
      count(distinct lp.lesson_id)::integer as progress_record_count,
      max(coalesce(lp.last_viewed_at, lp.completed_at))::timestamptz as latest_activity
    from entitled_lessons as el
    left join public.lesson_progress as lp
      on lp.user_id = el.learner_id
      and lp.course_id = el.entitled_course_id
      and lp.lesson_id = el.published_lesson_id
    group by el.learner_id
  ),
  mentorship_summary as (
    select distinct on (ma.user_id) ma.user_id::uuid as learner_id, ma.status::text as latest_status
    from public.mentorship_applications as ma
    order by ma.user_id, ma.created_at desc
  ),
  filtered as (
    select
      l.learner_id::uuid as student_id,
      l.learner_name::text as display_name,
      l.learner_email::text as email,
      l.learner_joined_at::timestamptz as joined_at,
      coalesce(ps.purchase_count, 0)::integer as courses_purchased,
      coalesce(ps.purchase_count, 0)::integer as active_course_entitlements,
      coalesce(prs.completed_count, 0)::integer as completed_lessons,
      coalesce(prs.published_count, 0)::integer as total_published_lessons,
      prs.latest_activity::timestamptz as last_learning_activity,
      ms.latest_status::text as mentorship_status,
      case
        when coalesce(prs.progress_record_count, 0) = 0 then 'not_started'
        when coalesce(prs.published_count, 0) > 0 and coalesce(prs.completed_count, 0) >= prs.published_count then 'completed'
        else 'in_progress'
      end::text as learning_state
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
        select 1
        from public.purchases as fp
        where fp.user_id = l.learner_id and fp.course_id = p_course_id
      )
    )
    and (p_mentorship_status is null or p_mentorship_status = 'all' or ms.latest_status = p_mentorship_status)
  )
  select
    f.student_id::uuid,
    f.display_name::text,
    f.email::text,
    f.joined_at::timestamptz,
    f.courses_purchased::integer,
    f.active_course_entitlements::integer,
    f.completed_lessons::integer,
    f.total_published_lessons::integer,
    f.last_learning_activity::timestamptz,
    f.mentorship_status::text,
    (count(*) over ())::integer as total_count
  from filtered as f
  where p_learning_state is null or p_learning_state = 'all' or f.learning_state = p_learning_state
  order by f.last_learning_activity desc nulls last, f.joined_at desc
  limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50);
end;
$$;

revoke all on function public.admin_list_students(text, uuid, text, text, integer, integer) from public;
grant execute on function public.admin_list_students(text, uuid, text, text, integer, integer) to authenticated;

commit;
