begin;

create or replace function public.admin_get_lesson_media(p_lesson_id uuid)
returns table (
  lesson_id uuid,
  course_id uuid,
  media_source text,
  video_storage_path text,
  video_poster_path text,
  video_mime_type text,
  video_duration_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select lesson.id,
         lesson.course_id,
         lesson.media_source,
         lesson.video_storage_path,
         lesson.video_poster_path,
         lesson.video_mime_type,
         lesson.video_duration_seconds
  from public.lessons as lesson
  where lesson.id = p_lesson_id;
end;
$$;

revoke all on function public.admin_get_lesson_media(uuid) from public, anon;
grant execute on function public.admin_get_lesson_media(uuid) to authenticated;

commit;
