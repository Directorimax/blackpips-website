begin;

-- Keep the legacy columns during the rollout.  They retain the first media item
-- for backwards-compatible clients; all new clients use trading_tip_media.
alter table public.trading_tips
  drop constraint if exists trading_tips_fixed_lifetime,
  alter column expires_at drop not null,
  alter column media_type drop not null,
  alter column media_path drop not null,
  alter column mime_type drop not null;

create table public.trading_tip_media (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.trading_tips(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  media_path text not null unique check (media_path ~* '^tips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  sort_order integer not null check (sort_order between 0 and 9),
  created_at timestamptz not null default now(),
  unique (tip_id, sort_order)
);
create index trading_tip_media_tip_order_idx on public.trading_tip_media (tip_id, sort_order);
alter table public.trading_tip_media drop constraint trading_tip_media_tip_id_sort_order_key;
alter table public.trading_tip_media add constraint trading_tip_media_tip_id_sort_order_key unique (tip_id, sort_order) deferrable initially deferred;

-- Backfill every existing single-media tip exactly once.
insert into public.trading_tip_media (tip_id, media_type, media_path, mime_type, sort_order, created_at)
select id, media_type, media_path, mime_type, 0, created_at
from public.trading_tips
where media_path is not null
on conflict (media_path) do nothing;

alter table public.trading_tips
  add constraint trading_tips_has_valid_expiry check (expires_at is null or expires_at > created_at);
create index trading_tips_active_feed_v2_idx on public.trading_tips (created_at desc)
  where expires_at is null or expires_at > created_at;

alter table public.trading_tips enable row level security;
drop policy if exists "Authenticated users read active trading tips" on public.trading_tips;
create policy "Authenticated users read active trading tips" on public.trading_tips
  for select to authenticated using (expires_at is null or expires_at > now());
create policy "Admins update trading tips" on public.trading_tips
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.trading_tip_media enable row level security;
grant select, insert, update, delete on public.trading_tip_media to authenticated;
create policy "Authenticated users read active trading tip media rows" on public.trading_tip_media
  for select to authenticated using (exists (
    select 1 from public.trading_tips t where t.id = tip_id and (t.expires_at is null or t.expires_at > now())
  ));
create policy "Admins manage trading tip media rows" on public.trading_tip_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Authenticated users read active trading tip media" on storage.objects;
create policy "Authenticated users read active trading tip media" on storage.objects for select to authenticated using (
  bucket_id = 'trading-tips' and exists (
    select 1 from public.trading_tip_media m
    join public.trading_tips t on t.id = m.tip_id
    where m.media_path = name and (t.expires_at is null or t.expires_at > now())
  )
);

create table public.trading_tip_reactions (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.trading_tips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '🔥', '👏', '💯', '🤯')),
  created_at timestamptz not null default now(),
  unique (tip_id, user_id)
);
create index trading_tip_reactions_tip_emoji_idx on public.trading_tip_reactions (tip_id, emoji);
alter table public.trading_tip_reactions enable row level security;
grant select, insert, update, delete on public.trading_tip_reactions to authenticated;
create policy "Users read reactions for active tips" on public.trading_tip_reactions
  for select to authenticated using (exists (
    select 1 from public.trading_tips t where t.id = tip_id and (t.expires_at is null or t.expires_at > now())
  ));
create policy "Users add their own reaction to active tips" on public.trading_tip_reactions
  for insert to authenticated with check (user_id = auth.uid() and exists (
    select 1 from public.trading_tips t where t.id = tip_id and (t.expires_at is null or t.expires_at > now())
  ));
create policy "Users update their own reaction on active tips" on public.trading_tip_reactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (
    select 1 from public.trading_tips t where t.id = tip_id and (t.expires_at is null or t.expires_at > now())
  ));
create policy "Users delete their own reaction" on public.trading_tip_reactions
  for delete to authenticated using (user_id = auth.uid());

-- One aggregate query for a page of feed cards; no reaction-row N+1 fetch.
create or replace function public.get_trading_tip_reaction_summary(p_tip_ids uuid[])
returns table (tip_id uuid, emoji text, reaction_count bigint, selected_emoji text)
language sql stable security invoker set search_path = public as $$
  select r.tip_id, r.emoji, count(*)::bigint,
    max(r.emoji) filter (where r.user_id = auth.uid()) as selected_emoji
  from public.trading_tip_reactions r
  join public.trading_tips t on t.id = r.tip_id
  where r.tip_id = any(p_tip_ids) and (t.expires_at is null or t.expires_at > now())
  group by r.tip_id, r.emoji
$$;
grant execute on function public.get_trading_tip_reaction_summary(uuid[]) to authenticated;

create or replace function public.admin_reorder_trading_tip_media(p_tip_id uuid, p_media_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if coalesce(array_length(p_media_ids, 1), 0) > 10 then raise exception 'A tip can contain at most ten media items'; end if;
  if (select count(*) from public.trading_tip_media where tip_id = p_tip_id) <> coalesce(array_length(p_media_ids, 1), 0)
     or (select count(*) from public.trading_tip_media where tip_id = p_tip_id and id = any(p_media_ids)) <> coalesce(array_length(p_media_ids, 1), 0) then
    raise exception 'Media list does not match this tip';
  end if;
  update public.trading_tip_media m set sort_order = source.position - 1
  from unnest(p_media_ids) with ordinality as source(id, position) where m.id = source.id;
  update public.trading_tips t set media_path = m.media_path, media_type = m.media_type, mime_type = m.mime_type
  from public.trading_tip_media m where t.id = p_tip_id and m.tip_id = t.id and m.sort_order = 0;
end;
$$;
revoke all on function public.admin_reorder_trading_tip_media(uuid, uuid[]) from public;
grant execute on function public.admin_reorder_trading_tip_media(uuid, uuid[]) to authenticated;

commit;
