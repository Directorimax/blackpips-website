begin;

-- Keep the bucket private while allowing genuine QuickTime uploads up to the
-- existing 50 MB bucket ceiling. Images retain their stricter client-side 10 MB limit.
update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
where id = 'trading-tips';

alter table public.trading_tips
  drop constraint if exists trading_tips_path_format,
  drop constraint if exists trading_tips_mime_type_check;
alter table public.trading_tips
  add constraint trading_tips_path_format check (
    media_path is null or media_path ~* '^tips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm|mov)$'
  ),
  add constraint trading_tips_mime_type_check check (
    mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime')
  );

alter table public.trading_tip_media
  drop constraint if exists trading_tip_media_media_path_check,
  drop constraint if exists trading_tip_media_mime_type_check;
alter table public.trading_tip_media
  add constraint trading_tip_media_media_path_check check (
    media_path ~* '^tips/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm|mov)$'
  ),
  add constraint trading_tip_media_mime_type_check check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime')
  );

commit;
