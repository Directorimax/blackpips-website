begin;

-- Corrects the already-deployed lesson RPCs. Output columns from RETURNS TABLE
-- are PL/pgSQL variables, so all public.lessons columns are explicitly aliased.
create or replace function public.normalize_lesson_positions(p_course_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  with ordered as (
    select l.id, row_number() over (order by l.position, l.created_at, l.id)::integer as normalized_position
    from public.lessons as l
    where l.course_id = p_course_id
  )
  update public.lessons as l
  set position = ordered.normalized_position,
      updated_at = now()
  from ordered
  where l.id = ordered.id;
$$;

create or replace function public.admin_save_lesson(
  p_lesson_id uuid default null,
  p_course_id uuid default null,
  p_title text default null,
  p_slug text default null,
  p_description text default null,
  p_video_url text default null,
  p_position integer default null,
  p_is_published boolean default false
)
returns table (id uuid, course_id uuid, slug text, lesson_position integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.lessons%rowtype;
  previous_course_id uuid;
  normalized_slug text;
  requested_position integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_course_id is null or not exists (select 1 from public.courses as c where c.id = p_course_id) then
    raise exception 'A valid course is required';
  end if;
  if nullif(trim(p_title), '') is null then raise exception 'Lesson title is required'; end if;
  if p_video_url is not null and trim(p_video_url) <> '' and trim(p_video_url) !~* '^https://.+' then
    raise exception 'Video URL must use HTTPS';
  end if;

  normalized_slug := trim(both '-' from regexp_replace(lower(coalesce(nullif(trim(p_slug), ''), trim(p_title))), '[^a-z0-9]+', '-', 'g'));
  if normalized_slug = '' then normalized_slug := 'lesson'; end if;
  if exists (
    select 1 from public.lessons as l
    where l.course_id = p_course_id
      and l.slug = normalized_slug
      and (p_lesson_id is null or l.id <> p_lesson_id)
  ) then
    normalized_slug := normalized_slug || '-' || left(gen_random_uuid()::text, 8);
  end if;

  if p_lesson_id is null then
    requested_position := coalesce(
      nullif(p_position, 0),
      (select coalesce(max(l.position), 0) + 1 from public.lessons as l where l.course_id = p_course_id)
    );
    insert into public.lessons (course_id, title, slug, description, video_url, position, is_published, updated_at)
    values (p_course_id, trim(p_title), normalized_slug, nullif(trim(p_description), ''), nullif(trim(p_video_url), ''), greatest(requested_position, 1), p_is_published, now())
    returning * into target;
  else
    select l.course_id into previous_course_id
    from public.lessons as l
    where l.id = p_lesson_id;

    update public.lessons as l
    set course_id = p_course_id,
        title = trim(p_title),
        slug = normalized_slug,
        description = nullif(trim(p_description), ''),
        video_url = nullif(trim(p_video_url), ''),
        position = greatest(coalesce(p_position, l.position), 1),
        is_published = p_is_published,
        updated_at = now()
    where l.id = p_lesson_id
    returning * into target;
    if not found then raise exception 'Lesson not found'; end if;
  end if;

  if previous_course_id is not null and previous_course_id <> target.course_id then
    perform public.normalize_lesson_positions(previous_course_id);
  end if;
  perform public.normalize_lesson_positions(target.course_id);
  select l.* into target from public.lessons as l where l.id = target.id;
  return query select target.id, target.course_id, target.slug, target.position;
end;
$$;

create or replace function public.admin_move_lesson(p_lesson_id uuid, p_direction text)
returns table (id uuid, lesson_position integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.lessons%rowtype;
  neighbor public.lessons%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_direction not in ('up', 'down') then raise exception 'Invalid lesson direction'; end if;
  select l.* into target from public.lessons as l where l.id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found'; end if;
  if p_direction = 'up' then
    select l.* into neighbor from public.lessons as l where l.course_id = target.course_id and (l.position, l.id) < (target.position, target.id) order by l.position desc, l.id desc limit 1 for update;
  else
    select l.* into neighbor from public.lessons as l where l.course_id = target.course_id and (l.position, l.id) > (target.position, target.id) order by l.position, l.id limit 1 for update;
  end if;
  if found then
    update public.lessons as l set position = target.position where l.id = neighbor.id;
    update public.lessons as l set position = neighbor.position where l.id = target.id;
  end if;
  perform public.normalize_lesson_positions(target.course_id);
  return query select l.id, l.position from public.lessons as l where l.id = target.id;
end;
$$;

create or replace function public.admin_delete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.lessons%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select l.* into target from public.lessons as l where l.id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found'; end if;
  delete from public.lessons as l where l.id = target.id;
  perform public.normalize_lesson_positions(target.course_id);
end;
$$;

grant execute on function public.admin_save_lesson(uuid, uuid, text, text, text, text, integer, boolean) to authenticated;
grant execute on function public.admin_move_lesson(uuid, text) to authenticated;
grant execute on function public.admin_delete_lesson(uuid) to authenticated;

commit;
