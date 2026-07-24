begin;

-- Premium lessons use public.lessons.id (uuid). The static free-library
-- catalogue has string IDs and is intentionally stored separately below.
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- The old local migration could have produced a text lesson_id table. Preserve
-- those static IDs in the free-library table before enforcing the UUID FK.
create table if not exists public.free_lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

do $$
declare
  lesson_id_type text;
begin
  select data_type into lesson_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'bookmarks'
    and column_name = 'lesson_id';

  if lesson_id_type = 'text' then
    alter table public.bookmarks rename column lesson_id to legacy_lesson_id;
    alter table public.bookmarks add column lesson_id uuid;

    insert into public.free_lesson_bookmarks (user_id, lesson_id, created_at)
    select b.user_id, b.legacy_lesson_id, b.created_at
    from public.bookmarks as b
    where b.legacy_lesson_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    on conflict (user_id, lesson_id) do nothing;

    update public.bookmarks as b
    set lesson_id = b.legacy_lesson_id::uuid
    where b.legacy_lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and exists (select 1 from public.lessons as l where l.id = b.legacy_lesson_id::uuid);

    delete from public.bookmarks where lesson_id is null;
    alter table public.bookmarks drop column legacy_lesson_id;
  end if;
end;
$$;

alter table public.bookmarks add column if not exists id uuid default gen_random_uuid();
alter table public.bookmarks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.bookmarks add column if not exists lesson_id uuid references public.lessons(id) on delete cascade;
alter table public.bookmarks add column if not exists created_at timestamptz default now();
update public.bookmarks set created_at = now() where created_at is null;
alter table public.bookmarks alter column user_id set not null;
alter table public.bookmarks alter column lesson_id set not null;
alter table public.bookmarks alter column created_at set not null;
alter table public.bookmarks alter column created_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookmarks'::regclass and contype = 'p'
  ) then
    alter table public.bookmarks add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookmarks'::regclass
      and conname = 'bookmarks_lesson_id_fkey'
  ) then
    alter table public.bookmarks
      add constraint bookmarks_lesson_id_fkey
      foreign key (lesson_id) references public.lessons(id) on delete cascade;
  end if;
end;
$$;

create unique index if not exists bookmarks_user_lesson_key on public.bookmarks (user_id, lesson_id);
create index if not exists bookmarks_user_created_at_idx on public.bookmarks (user_id, created_at desc);
create index if not exists free_lesson_bookmarks_user_created_at_idx
  on public.free_lesson_bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;
alter table public.free_lesson_bookmarks enable row level security;

revoke all on public.bookmarks from authenticated;
revoke all on public.free_lesson_bookmarks from authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, insert, delete on public.free_lesson_bookmarks to authenticated;

drop policy if exists "Users manage own bookmarks" on public.bookmarks;
drop policy if exists "Users read own bookmarks" on public.bookmarks;
drop policy if exists "Users insert own bookmarks" on public.bookmarks;
drop policy if exists "Users delete own bookmarks" on public.bookmarks;
create policy "Users read own bookmarks" on public.bookmarks
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own bookmarks" on public.bookmarks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own bookmarks" on public.bookmarks
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users read own free lesson bookmarks" on public.free_lesson_bookmarks;
drop policy if exists "Users insert own free lesson bookmarks" on public.free_lesson_bookmarks;
drop policy if exists "Users delete own free lesson bookmarks" on public.free_lesson_bookmarks;
create policy "Users read own free lesson bookmarks" on public.free_lesson_bookmarks
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own free lesson bookmarks" on public.free_lesson_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own free lesson bookmarks" on public.free_lesson_bookmarks
  for delete to authenticated using (auth.uid() = user_id);

commit;
