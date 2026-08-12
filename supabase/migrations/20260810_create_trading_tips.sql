begin;

create table public.trading_tips (
  id uuid primary key default gen_random_uuid(),
  title text,
  caption text not null,
  media_type text not null check (media_type in ('image', 'video')),
  media_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  constraint trading_tips_title_length check (coalesce(char_length(title), 0) <= 160),
  constraint trading_tips_caption_length check (char_length(caption) between 1 and 3000),
  constraint trading_tips_path_format check (media_path ~ '^tips/[0-9a-f-]{36}/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp|mp4|webm)$'),
  constraint trading_tips_fixed_lifetime check (expires_at = created_at + interval '72 hours')
);

create index trading_tips_active_feed_idx on public.trading_tips (created_at desc) where expires_at > created_at;
create index trading_tips_expiry_idx on public.trading_tips (expires_at);

alter table public.trading_tips enable row level security;
grant select, insert, delete on public.trading_tips to authenticated;

create policy "Authenticated users read active trading tips" on public.trading_tips
  for select to authenticated using (expires_at > now());
create policy "Admins create trading tips" on public.trading_tips
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
create policy "Admins delete trading tips" on public.trading_tips
  for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trading-tips', 'trading-tips', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

create policy "Admins upload trading tip media" on storage.objects for insert to authenticated
  with check (bucket_id = 'trading-tips' and public.is_admin() and name ~ '^tips/[0-9a-f-]{36}/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp|mp4|webm)$');
create policy "Authenticated users read active trading tip media" on storage.objects for select to authenticated
  using (bucket_id = 'trading-tips' and exists (
    select 1 from public.trading_tips t where t.media_path = name and t.expires_at > now()
  ));
create policy "Admins read trading tip media" on storage.objects for select to authenticated
  using (bucket_id = 'trading-tips' and public.is_admin());
create policy "Admins delete trading tip media" on storage.objects for delete to authenticated
  using (bucket_id = 'trading-tips' and public.is_admin());

-- Cron calls an Edge Function because Storage objects must be removed through the Storage API.
-- Set the two Vault secrets named below before enabling this job (see deployment checklist).
create or replace function public.invoke_trading_tips_cleanup()
returns void language plpgsql security definer set search_path = public, extensions, vault as $$
declare cleanup_url text; cron_secret text;
begin
  select decrypted_secret into cleanup_url from vault.decrypted_secrets where name = 'TRADING_TIPS_CLEANUP_URL';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'TRADING_TIPS_CRON_SECRET';
  if cleanup_url is null or cron_secret is null then
    raise exception 'Trading Tips cleanup Vault secrets are not configured';
  end if;
  perform net.http_post(url := cleanup_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Cron-Secret', cron_secret),
    body := '{}'::jsonb);
end;
$$;

revoke all on function public.invoke_trading_tips_cleanup() from public, anon, authenticated;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-trading-tips';
select cron.schedule('cleanup-trading-tips', '*/15 * * * *', 'select public.invoke_trading_tips_cleanup()');

commit;
