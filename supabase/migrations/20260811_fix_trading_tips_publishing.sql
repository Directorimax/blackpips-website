begin;

drop policy if exists "Admins upload trading tip media" on storage.objects;

create policy "Admins upload trading tip media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trading-tips'
  and public.is_admin()
  and (storage.foldername(name))[1] = 'tips'
);

alter table public.trading_tips
drop constraint if exists trading_tips_path_format;

alter table public.trading_tips
add constraint trading_tips_path_format
check (
  media_path ~* '^tips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm)$'
);

commit;
