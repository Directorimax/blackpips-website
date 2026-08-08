begin;

-- The review RPC is SECURITY INVOKER, so its UPDATE remains subject to RLS.
-- Keep admin access narrow and tied to the existing trusted is_admin() check.
drop policy if exists "Admins read ALC access requests" on public.alc_access_requests;
create policy "Admins read ALC access requests"
on public.alc_access_requests
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins review ALC access requests" on public.alc_access_requests;
create policy "Admins review ALC access requests"
on public.alc_access_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Persisted request details are needed to rebuild the existing learner
-- WhatsApp message after refresh. RLS still limits this row to its owner.
drop function if exists public.alc_access_my_request();
create function public.alc_access_my_request()
returns table(
  id uuid,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  full_name text,
  email text,
  phone text,
  program text,
  other_program text,
  study_year integer,
  public_review_message text
)
language sql
security invoker
set search_path = public
as $$
  select
    r.id,
    r.status,
    r.created_at,
    r.reviewed_at,
    r.full_name,
    r.email,
    r.phone,
    r.program,
    r.other_program,
    r.study_year,
    r.public_review_message
  from public.alc_access_requests as r
  where r.user_id = auth.uid()
  order by r.created_at desc
  limit 1
$$;

revoke all on function public.alc_access_my_request() from public, anon;
grant execute on function public.alc_access_my_request() to authenticated;

commit;
