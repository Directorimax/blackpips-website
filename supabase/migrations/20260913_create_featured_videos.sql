begin;

create table public.featured_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  title text not null,
  display_order integer not null check (display_order > 0),
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_videos_youtube_id_format check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint featured_videos_title_length check (char_length(trim(title)) between 1 and 160)
);

create index featured_videos_learner_order_idx
  on public.featured_videos (display_order, id) where is_active;

create or replace function public.enforce_featured_video_active_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_active and (tg_op = 'INSERT' or not old.is_active) then
    perform pg_advisory_xact_lock(hashtext('featured_videos_active_limit'));
    if (select count(*) from public.featured_videos v
        where v.is_active and v.id is distinct from new.id) >= 5 then
      raise exception 'A maximum of 5 featured videos may be active';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger enforce_featured_video_active_limit
before insert or update on public.featured_videos
for each row execute function public.enforce_featured_video_active_limit();

alter table public.featured_videos enable row level security;
grant select on public.featured_videos to anon, authenticated;

create policy "Visitors read active featured videos"
on public.featured_videos for select to anon, authenticated
using (is_active or public.is_admin());

create or replace function public.list_featured_videos()
returns table (
  id uuid,
  youtube_video_id text,
  title text,
  display_order integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select v.id, v.youtube_video_id, v.title, v.display_order
  from public.featured_videos v
  where v.is_active
  order by v.display_order, v.id
$$;

grant execute on function public.list_featured_videos() to anon, authenticated;

create or replace function public.admin_list_featured_videos()
returns setof public.featured_videos
language sql
stable
security definer
set search_path = public
as $$
  select v.* from public.featured_videos v
  where public.is_admin()
  order by v.display_order, v.id
$$;

create or replace function public.admin_save_featured_video(
  p_video_id uuid default null,
  p_youtube_video_id text default null,
  p_title text default null,
  p_display_order integer default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  old_order integer;
  requested_order integer;
  max_order integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if coalesce(p_youtube_video_id, '') !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'A valid YouTube video ID is required'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 1 and 160 then raise exception 'A valid title is required'; end if;
  perform pg_advisory_xact_lock(hashtext('featured_videos_order'));
  select count(*) into max_order from public.featured_videos;

  if p_video_id is null then
    requested_order := least(greatest(coalesce(p_display_order, max_order + 1), 1), max_order + 1);
    update public.featured_videos set display_order = display_order + 1 where display_order >= requested_order;
    insert into public.featured_videos(youtube_video_id, title, display_order, is_active)
    values (p_youtube_video_id, trim(p_title), requested_order, p_is_active)
    returning id into saved_id;
  else
    select display_order into old_order from public.featured_videos where id = p_video_id for update;
    if not found then raise exception 'Featured video not found'; end if;
    requested_order := least(greatest(coalesce(p_display_order, old_order), 1), greatest(max_order, 1));
    if requested_order < old_order then
      update public.featured_videos set display_order = display_order + 1
      where id <> p_video_id and display_order >= requested_order and display_order < old_order;
    elsif requested_order > old_order then
      update public.featured_videos set display_order = display_order - 1
      where id <> p_video_id and display_order > old_order and display_order <= requested_order;
    end if;
    update public.featured_videos
    set youtube_video_id = p_youtube_video_id, title = trim(p_title),
        display_order = requested_order, is_active = p_is_active
    where id = p_video_id returning id into saved_id;
  end if;
  return saved_id;
end;
$$;

create or replace function public.admin_move_featured_video(p_video_id uuid, p_direction text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.featured_videos%rowtype;
  neighbor public.featured_videos%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_direction not in ('up', 'down') then raise exception 'Invalid direction'; end if;
  perform pg_advisory_xact_lock(hashtext('featured_videos_order'));
  select * into target from public.featured_videos where id = p_video_id for update;
  if not found then raise exception 'Featured video not found'; end if;
  if p_direction = 'up' then
    select * into neighbor from public.featured_videos
    where (display_order, id) < (target.display_order, target.id)
    order by display_order desc, id desc limit 1 for update;
  else
    select * into neighbor from public.featured_videos
    where (display_order, id) > (target.display_order, target.id)
    order by display_order, id limit 1 for update;
  end if;
  if found then
    update public.featured_videos set display_order = neighbor.display_order where id = target.id;
    update public.featured_videos set display_order = target.display_order where id = neighbor.id;
  end if;
end;
$$;

create or replace function public.admin_delete_featured_video(p_video_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare deleted_order integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  perform pg_advisory_xact_lock(hashtext('featured_videos_order'));
  delete from public.featured_videos where id = p_video_id returning display_order into deleted_order;
  if not found then raise exception 'Featured video not found'; end if;
  update public.featured_videos set display_order = display_order - 1 where display_order > deleted_order;
end;
$$;

revoke all on function public.admin_list_featured_videos() from public, anon;
revoke all on function public.admin_save_featured_video(uuid, text, text, integer, boolean) from public, anon;
revoke all on function public.admin_move_featured_video(uuid, text) from public, anon;
revoke all on function public.admin_delete_featured_video(uuid) from public, anon;
grant execute on function public.admin_list_featured_videos() to authenticated;
grant execute on function public.admin_save_featured_video(uuid, text, text, integer, boolean) to authenticated;
grant execute on function public.admin_move_featured_video(uuid, text) to authenticated;
grant execute on function public.admin_delete_featured_video(uuid) to authenticated;

commit;
