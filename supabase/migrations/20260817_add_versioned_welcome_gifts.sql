create table if not exists public.user_gift_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gift_id text not null,
  claimed_at timestamptz not null default now(),
  constraint user_gift_claims_gift_id_length check (char_length(gift_id) between 1 and 120),
  constraint user_gift_claims_user_gift_unique unique (user_id, gift_id)
);

create index if not exists user_gift_claims_user_id_idx
  on public.user_gift_claims(user_id);

alter table public.user_gift_claims enable row level security;

drop policy if exists "Users can read their own gift claims" on public.user_gift_claims;
create policy "Users can read their own gift claims"
  on public.user_gift_claims for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can claim gifts for themselves" on public.user_gift_claims;
create policy "Users can claim gifts for themselves"
  on public.user_gift_claims for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.user_gift_claims to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('welcome-gifts', 'welcome-gifts', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Claimed users can read welcome gift files" on storage.objects;
create policy "Claimed users can read welcome gift files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'welcome-gifts'
    and exists (
      select 1
      from public.user_gift_claims claims
      where claims.user_id = auth.uid()
        and claims.gift_id = split_part(name, '/', 1)
    )
  );
