begin;

-- The connected project already has public.lessons. These additive fields make
-- its existing rows usable by the premium lesson routes without deleting data.
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null
);

alter table public.lessons add column if not exists slug text;
alter table public.lessons add column if not exists description text;
alter table public.lessons add column if not exists video_url text;
alter table public.lessons add column if not exists position integer;
alter table public.lessons add column if not exists is_published boolean;
alter table public.lessons add column if not exists created_at timestamptz not null default now();
alter table public.lessons add column if not exists updated_at timestamptz not null default now();

-- There was no prior publication field. Existing lessons are treated as the
-- currently visible curriculum, while future rows default to unpublished.
update public.lessons
set is_published = true
where is_published is null;
alter table public.lessons alter column is_published set default false;
alter table public.lessons alter column is_published set not null;

-- Give pre-existing lessons stable, collision-free URLs and a deterministic
-- order without overwriting any populated values.
update public.lessons
set slug = concat(
  nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''),
  '-',
  left(id::text, 8)
)
where slug is null or btrim(slug) = '';
alter table public.lessons alter column slug set not null;

with numbered_lessons as (
  select id, row_number() over (partition by course_id order by created_at, id)::integer as row_position
  from public.lessons
  where position is null
)
update public.lessons
set position = numbered_lessons.row_position
from numbered_lessons
where lessons.id = numbered_lessons.id;
alter table public.lessons alter column position set default 0;
alter table public.lessons alter column position set not null;

create unique index if not exists lessons_course_slug_key on public.lessons (course_id, slug);
create index if not exists lessons_course_published_position_idx
  on public.lessons (course_id, is_published, position);

alter table public.lessons enable row level security;
revoke select on public.lessons from anon;
grant select on public.lessons to authenticated;
drop policy if exists "Purchased learners can view published lessons" on public.lessons;
create policy "Purchased learners can view published lessons" on public.lessons
for select to authenticated using (
  is_published
  and exists (
    select 1 from public.purchases
    where purchases.user_id = auth.uid()
      and purchases.course_id = lessons.course_id
  )
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  is_completed boolean not null default false,
  unique (user_id, lesson_id)
);

create index if not exists lesson_progress_user_last_viewed_idx
  on public.lesson_progress (user_id, last_viewed_at desc);
create index if not exists lesson_progress_user_course_idx
  on public.lesson_progress (user_id, course_id);

alter table public.lesson_progress enable row level security;
grant select, insert, update on public.lesson_progress to authenticated;

drop policy if exists "Learners read own lesson progress" on public.lesson_progress;
create policy "Learners read own lesson progress" on public.lesson_progress
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Entitled learners create own lesson progress" on public.lesson_progress;
create policy "Entitled learners create own lesson progress" on public.lesson_progress
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lessons
    join public.purchases on purchases.course_id = lessons.course_id
    where lessons.id = lesson_progress.lesson_id
      and lessons.course_id = lesson_progress.course_id
      and lessons.is_published
      and purchases.user_id = auth.uid()
  )
);

drop policy if exists "Entitled learners update own lesson progress" on public.lesson_progress;
create policy "Entitled learners update own lesson progress" on public.lesson_progress
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lessons
    join public.purchases on purchases.course_id = lessons.course_id
    where lessons.id = lesson_progress.lesson_id
      and lessons.course_id = lesson_progress.course_id
      and lessons.is_published
      and purchases.user_id = auth.uid()
  )
);

commit;
