begin;

alter table public.email_notifications
  drop constraint if exists email_notifications_event_type_check;

alter table public.email_notifications
  add constraint email_notifications_event_type_check
  check (event_type in (
    'welcome',
    'payment_approved',
    'course_unlocked',
    'payment_submitted',
    'payment_rejected',
    'mentorship_submitted',
    'mentorship_approved',
    'mentorship_rejected',
    'certificate_earned',
    'alc_access_approved',
    'alc_access_rejected'
  ));

-- The learner library RPC is SECURITY INVOKER. These policies permit only
-- published ALC content and only while the caller has an approved entitlement.
drop policy if exists "Approved learners read published ALC modules" on public.alc_access_modules;
create policy "Approved learners read published ALC modules"
on public.alc_access_modules
for select
to authenticated
using (
  is_published
  and exists (
    select 1
    from public.alc_access_requests as r
    where r.user_id = auth.uid() and r.status = 'approved'
  )
);

drop policy if exists "Approved learners read published ALC videos" on public.alc_access_videos;
create policy "Approved learners read published ALC videos"
on public.alc_access_videos
for select
to authenticated
using (
  is_published
  and exists (
    select 1
    from public.alc_access_modules as m
    where m.id = module_id and m.is_published
  )
  and exists (
    select 1
    from public.alc_access_requests as r
    where r.user_id = auth.uid() and r.status = 'approved'
  )
);

create or replace function public.admin_list_alc_modules()
returns table(id uuid, title text, description text, sort_order integer, is_published boolean)
language sql
security definer
set search_path = public
as $$
  select m.id, m.title, m.description, m.sort_order, m.is_published
  from public.alc_access_modules as m
  where public.is_admin()
  order by m.sort_order, m.created_at, m.id
$$;

create or replace function public.admin_list_alc_videos()
returns table(
  id uuid,
  module_id uuid,
  title text,
  description text,
  video_url text,
  sort_order integer,
  is_published boolean
)
language sql
security definer
set search_path = public
as $$
  select v.id, v.module_id, v.title, v.description, v.video_url, v.sort_order, v.is_published
  from public.alc_access_videos as v
  where public.is_admin() and v.module_id is not null
  order by v.module_id, v.sort_order, v.created_at, v.id
$$;

create or replace function public.admin_save_alc_module(
  p_module_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_sort_order integer default null,
  p_is_published boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  requested_order integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 160 then
    raise exception 'A valid module title is required';
  end if;
  if coalesce(char_length(p_description), 0) > 1000 then raise exception 'Module description is too long'; end if;
  requested_order := greatest(coalesce(p_sort_order, 1), 1);

  if p_module_id is null then
    if p_sort_order is null then
      select coalesce(max(m.sort_order), 0) + 1 into requested_order
      from public.alc_access_modules as m;
    end if;
    insert into public.alc_access_modules(title, description, sort_order, is_published)
    values (trim(p_title), nullif(trim(p_description), ''), requested_order, p_is_published)
    returning id into saved_id;
  else
    update public.alc_access_modules as m
    set title = trim(p_title),
        description = nullif(trim(p_description), ''),
        sort_order = requested_order,
        is_published = p_is_published,
        updated_at = now()
    where m.id = p_module_id
    returning m.id into saved_id;
    if not found then raise exception 'ALC module not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.admin_save_alc_video(
  p_video_id uuid default null,
  p_module_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_video_url text default null,
  p_sort_order integer default null,
  p_is_published boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  requested_order integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_module_id is null or not exists (select 1 from public.alc_access_modules as m where m.id = p_module_id) then
    raise exception 'A valid ALC module is required';
  end if;
  if nullif(trim(p_title), '') is null or char_length(trim(p_title)) > 160 then
    raise exception 'A valid video title is required';
  end if;
  if coalesce(char_length(p_description), 0) > 1000 then raise exception 'Video description is too long'; end if;
  if nullif(trim(p_video_url), '') is null or trim(p_video_url) !~* '^https://.+' or char_length(trim(p_video_url)) > 1000 then
    raise exception 'A valid HTTPS video URL is required';
  end if;
  requested_order := greatest(coalesce(p_sort_order, 1), 1);

  if p_video_id is null then
    if p_sort_order is null then
      select coalesce(max(v.sort_order), 0) + 1 into requested_order
      from public.alc_access_videos as v
      where v.module_id = p_module_id;
    end if;
    insert into public.alc_access_videos(module_id, title, description, video_url, sort_order, is_published)
    values (p_module_id, trim(p_title), nullif(trim(p_description), ''), trim(p_video_url), requested_order, p_is_published)
    returning id into saved_id;
  else
    update public.alc_access_videos as v
    set module_id = p_module_id,
        title = trim(p_title),
        description = nullif(trim(p_description), ''),
        video_url = trim(p_video_url),
        sort_order = requested_order,
        is_published = p_is_published,
        updated_at = now()
    where v.id = p_video_id
    returning v.id into saved_id;
    if not found then raise exception 'ALC video not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.admin_move_alc_video(p_video_id uuid, p_direction text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.alc_access_videos%rowtype;
  neighbor public.alc_access_videos%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_direction not in ('up', 'down') then raise exception 'Invalid video direction'; end if;
  select v.* into target from public.alc_access_videos as v where v.id = p_video_id for update;
  if not found then raise exception 'ALC video not found'; end if;
  if p_direction = 'up' then
    select v.* into neighbor from public.alc_access_videos as v
    where v.module_id = target.module_id and (v.sort_order, v.id) < (target.sort_order, target.id)
    order by v.sort_order desc, v.id desc limit 1 for update;
  else
    select v.* into neighbor from public.alc_access_videos as v
    where v.module_id = target.module_id and (v.sort_order, v.id) > (target.sort_order, target.id)
    order by v.sort_order, v.id limit 1 for update;
  end if;
  if found then
    update public.alc_access_videos as v set sort_order = neighbor.sort_order, updated_at = now() where v.id = target.id;
    update public.alc_access_videos as v set sort_order = target.sort_order, updated_at = now() where v.id = neighbor.id;
  end if;
end;
$$;

create or replace function public.admin_delete_alc_video(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  delete from public.alc_access_videos as v where v.id = p_video_id;
  if not found then raise exception 'ALC video not found'; end if;
end;
$$;

revoke all on function public.admin_list_alc_modules() from public, anon;
revoke all on function public.admin_list_alc_videos() from public, anon;
revoke all on function public.admin_save_alc_module(uuid, text, text, integer, boolean) from public, anon;
revoke all on function public.admin_save_alc_video(uuid, uuid, text, text, text, integer, boolean) from public, anon;
revoke all on function public.admin_move_alc_video(uuid, text) from public, anon;
revoke all on function public.admin_delete_alc_video(uuid) from public, anon;

grant execute on function public.admin_list_alc_modules() to authenticated;
grant execute on function public.admin_list_alc_videos() to authenticated;
grant execute on function public.admin_save_alc_module(uuid, text, text, integer, boolean) to authenticated;
grant execute on function public.admin_save_alc_video(uuid, uuid, text, text, text, integer, boolean) to authenticated;
grant execute on function public.admin_move_alc_video(uuid, text) to authenticated;
grant execute on function public.admin_delete_alc_video(uuid) to authenticated;

commit;
