begin;

-- Additive foundation only. This migration deliberately does not copy media,
-- change production playback, or remove the legacy lesson media columns.
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  storage_provider text not null check (storage_provider in ('contabo', 'r2')),
  object_key text not null check (btrim(object_key) <> ''),
  mime_type text not null check (mime_type ~ '^video/'),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  checksum_sha256 text check (
    checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  status text not null default 'pending'
    check (status in ('pending', 'available', 'unavailable', 'quarantined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_provider, object_key)
);

-- A checksum is authoritative only when present. Null checksums are never
-- deduplicated by title or object name.
create unique index if not exists media_assets_sha256_key
  on public.media_assets (checksum_sha256)
  where checksum_sha256 is not null;
create index if not exists media_assets_status_title_idx
  on public.media_assets (status, title);

create table if not exists public.lesson_media_assets (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  attached_at timestamptz not null default now(),
  attached_by uuid references auth.users(id) on delete set null
);

create index if not exists lesson_media_assets_asset_idx
  on public.lesson_media_assets (media_asset_id, lesson_id);

-- Keeps resumable migration evidence separate from the reusable asset and the
-- course-specific lesson. This makes a migration restartable and auditable.
create table if not exists public.media_asset_sources (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  source_provider text not null default 'contabo',
  source_object_path text not null check (btrim(source_object_path) <> ''),
  source_lesson_id uuid references public.lessons(id) on delete set null,
  source_course_id uuid references public.courses(id) on delete set null,
  observed_title text,
  observed_file_size_bytes bigint check (
    observed_file_size_bytes is null or observed_file_size_bytes > 0
  ),
  observed_mime_type text,
  observed_duration_seconds integer check (
    observed_duration_seconds is null or observed_duration_seconds > 0
  ),
  observed_checksum_sha256 text check (
    observed_checksum_sha256 is null or observed_checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  migration_status text not null default 'pending'
    check (migration_status in ('pending', 'copied', 'verified', 'failed', 'skipped')),
  destination_object_key text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_provider, source_object_path)
);

alter table public.media_assets enable row level security;
alter table public.lesson_media_assets enable row level security;
alter table public.media_asset_sources enable row level security;
revoke all on public.media_assets, public.lesson_media_assets, public.media_asset_sources
  from public, anon, authenticated;

create or replace function public.admin_list_media_assets()
returns table (
  id uuid,
  title text,
  storage_provider text,
  object_key text,
  mime_type text,
  file_size_bytes bigint,
  duration_seconds integer,
  checksum_sha256 text,
  status text,
  usage_count bigint
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
    select asset.id, asset.title, asset.storage_provider, asset.object_key,
      asset.mime_type, asset.file_size_bytes, asset.duration_seconds,
      asset.checksum_sha256, asset.status, count(link.lesson_id)::bigint
    from public.media_assets asset
    left join public.lesson_media_assets link on link.media_asset_id = asset.id
    group by asset.id
    order by asset.title, asset.id;
end;
$$;

create or replace function public.admin_list_media_asset_usage(p_media_asset_id uuid)
returns table (
  lesson_id uuid,
  lesson_title text,
  course_id uuid,
  course_title text,
  is_published boolean,
  lesson_position integer
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
    select lesson.id, lesson.title, course.id, course.title,
      lesson.is_published, lesson.position
    from public.lesson_media_assets link
    join public.lessons lesson on lesson.id = link.lesson_id
    join public.courses course on course.id = lesson.course_id
    where link.media_asset_id = p_media_asset_id
    order by course.title, lesson.position, lesson.id;
end;
$$;

create or replace function public.admin_attach_media_asset(
  p_lesson_id uuid,
  p_media_asset_id uuid
)
returns table (lesson_id uuid, media_asset_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'Lesson not found';
  end if;
  if not exists (
    select 1 from public.media_assets
    where id = p_media_asset_id and status = 'available'
  ) then
    raise exception 'An available media asset is required';
  end if;
  insert into public.lesson_media_assets (lesson_id, media_asset_id, attached_by)
  values (p_lesson_id, p_media_asset_id, auth.uid())
  on conflict (lesson_id) do update
    set media_asset_id = excluded.media_asset_id,
        attached_at = now(),
        attached_by = auth.uid();
  return query select p_lesson_id, p_media_asset_id;
end;
$$;

create or replace function public.admin_unlink_media_asset(
  p_lesson_id uuid,
  p_expected_media_asset_id uuid default null
)
returns table (lesson_id uuid, detached_media_asset_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare detached uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  delete from public.lesson_media_assets link
  where link.lesson_id = p_lesson_id
    and (p_expected_media_asset_id is null or link.media_asset_id = p_expected_media_asset_id)
  returning link.media_asset_id into detached;
  if detached is null then raise exception 'Lesson media link not found or changed'; end if;
  -- Never delete the lesson, progress rows, or shared asset here.
  return query select p_lesson_id, detached;
end;
$$;

-- Shared response contract consumed by both the website and Flutter clients.
-- Usage is returned with each asset so either panel can show cross-course
-- relationships from one consistent snapshot.
create or replace function public.admin_list_media_assets_v2()
returns table (
  id uuid,
  title text,
  storage_provider text,
  object_key text,
  mime_type text,
  file_size_bytes bigint,
  duration_seconds integer,
  checksum_sha256 text,
  status text,
  usage_count bigint,
  usage jsonb
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
    select asset.id, asset.title, asset.storage_provider, asset.object_key,
      asset.mime_type, asset.file_size_bytes, asset.duration_seconds,
      asset.checksum_sha256, asset.status,
      count(link.lesson_id)::bigint,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'lesson_id', lesson.id,
            'lesson_title', lesson.title,
            'course_id', course.id,
            'course_title', course.title,
            'is_published', lesson.is_published,
            'lesson_position', lesson.position
          ) order by course.title, lesson.position, lesson.id
        ) filter (where lesson.id is not null),
        '[]'::jsonb
      )
    from public.media_assets asset
    left join public.lesson_media_assets link on link.media_asset_id = asset.id
    left join public.lessons lesson on lesson.id = link.lesson_id
    left join public.courses course on course.id = lesson.course_id
    group by asset.id
    order by asset.title, asset.id;
end;
$$;

create or replace function public.admin_delete_media_asset(p_media_asset_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.lesson_media_assets
    where media_asset_id = p_media_asset_id
  ) then
    raise exception 'Media asset is still referenced by one or more lessons'
      using errcode = '23503';
  end if;
  -- Catalog deletion never deletes a private storage object. Object lifecycle
  -- requires a separately approved backend operation.
  delete from public.media_assets where id = p_media_asset_id;
  if not found then raise exception 'Media asset not found'; end if;
  return p_media_asset_id;
end;
$$;

create or replace function public.admin_list_media_lesson_candidates()
returns table (
  lesson_id uuid,
  lesson_title text,
  course_id uuid,
  course_title text,
  is_published boolean,
  lesson_position integer,
  media_asset_id uuid
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
    select lesson.id, lesson.title, course.id, course.title,
      lesson.is_published, lesson.position, link.media_asset_id
    from public.lessons lesson
    join public.courses course on course.id = lesson.course_id
    left join public.lesson_media_assets link on link.lesson_id = lesson.id
    order by course.title, lesson.position, lesson.id;
end;
$$;

revoke all on function public.admin_list_media_assets() from public, anon;
revoke all on function public.admin_list_media_asset_usage(uuid) from public, anon;
revoke all on function public.admin_attach_media_asset(uuid, uuid) from public, anon;
revoke all on function public.admin_unlink_media_asset(uuid, uuid) from public, anon;
grant execute on function public.admin_list_media_assets() to authenticated;
grant execute on function public.admin_list_media_asset_usage(uuid) to authenticated;
grant execute on function public.admin_attach_media_asset(uuid, uuid) to authenticated;
grant execute on function public.admin_unlink_media_asset(uuid, uuid) to authenticated;
revoke all on function public.admin_list_media_assets_v2() from public, anon;
revoke all on function public.admin_delete_media_asset(uuid) from public, anon;
grant execute on function public.admin_list_media_assets_v2() to authenticated;
grant execute on function public.admin_delete_media_asset(uuid) to authenticated;
revoke all on function public.admin_list_media_lesson_candidates() from public, anon;
grant execute on function public.admin_list_media_lesson_candidates() to authenticated;

commit;
