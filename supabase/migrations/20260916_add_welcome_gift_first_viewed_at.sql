begin;

-- Client roles must mutate viewed state only through the narrow RPC below.
revoke update on table public.user_gift_claims from anon;
revoke update on table public.user_gift_claims from authenticated;

alter table public.user_gift_claims
  add column if not exists first_viewed_at timestamptz null;

create or replace function public.mark_welcome_gift_viewed(p_gift_id text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  authoritative_first_viewed_at timestamptz;
begin
  if caller_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  update public.user_gift_claims
  set first_viewed_at = coalesce(first_viewed_at, now())
  where user_id = caller_id
    and gift_id = p_gift_id
  returning first_viewed_at into authoritative_first_viewed_at;

  if authoritative_first_viewed_at is null then
    raise exception 'Welcome Gift claim not found.' using errcode = 'P0002';
  end if;

  return authoritative_first_viewed_at;
end;
$$;

revoke all on function public.mark_welcome_gift_viewed(text) from public;
revoke all on function public.mark_welcome_gift_viewed(text) from anon;
revoke all on function public.mark_welcome_gift_viewed(text) from authenticated;
grant execute on function public.mark_welcome_gift_viewed(text) to authenticated;

comment on function public.mark_welcome_gift_viewed(text) is
  'Idempotently records the authenticated owner''s first successful Welcome Gift view.';

commit;
