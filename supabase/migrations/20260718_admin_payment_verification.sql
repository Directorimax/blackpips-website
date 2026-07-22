begin;

alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'admin'));

alter table public.payments add column if not exists reviewed_at timestamptz;
alter table public.payments add column if not exists reviewed_by uuid references auth.users(id);
alter table public.payments add column if not exists rejection_reason text;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending', 'approved', 'rejected', 'paid', 'failed', 'cancelled'));

alter table public.purchases enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can change profile roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

drop policy if exists "Admins can view all payments" on public.payments;
create policy "Admins can view all payments" on public.payments
for select using (public.is_admin());

drop policy if exists "Users can view own purchases" on public.purchases;
create policy "Users can view own purchases" on public.purchases
for select using (auth.uid() = user_id);

drop policy if exists "Admins can view all purchases" on public.purchases;
create policy "Admins can view all purchases" on public.purchases
for select using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

drop policy if exists "Users upload own payment proofs" on storage.objects;
create policy "Users upload own payment proofs" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read own payment proofs" on storage.objects;
create policy "Users read own payment proofs" on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Users delete own payment proofs" on storage.objects;
create policy "Users delete own payment proofs" on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

create or replace function public.admin_list_payments(p_status text default 'pending')
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  display_name text,
  course_title text,
  amount numeric,
  currency text,
  payment_method text,
  provider text,
  transaction_id text,
  proof_url text,
  status text,
  rejection_reason text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query
  select p.id, p.user_id, au.email, pr.display_name, c.title, p.amount, p.currency,
         p.payment_method, p.provider, p.transaction_id, p.proof_url, p.status,
         p.rejection_reason, p.created_at
  from public.payments p
  join public.courses c on c.id = p.course_id
  left join public.profiles pr on pr.id = p.user_id
  left join auth.users au on au.id = p.user_id
  where p_status = 'all' or p.status = p_status
  order by p.created_at desc;
end;
$$;

create or replace function public.approve_payment(p_payment_id uuid)
returns table (id uuid, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare target public.payments%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into target from public.payments where payments.id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if target.status <> 'pending' then raise exception 'Only pending payments can be approved'; end if;
  perform pg_advisory_xact_lock(hashtext(target.user_id::text || ':' || target.course_id::text));
  if exists (select 1 from public.purchases where user_id = target.user_id and course_id = target.course_id) then
    raise exception 'This learner already has access to this course';
  end if;
  insert into public.purchases (user_id, course_id, amount, payment_status, transaction_id)
  values (target.user_id, target.course_id, target.amount, 'approved', target.transaction_id);
  update public.payments
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null
  where payments.id = target.id
  returning payments.id, payments.status, payments.created_at into id, status, created_at;
  return next;
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns table (id uuid, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare target public.payments%rowtype; reason text := trim(p_reason);
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if reason = '' then raise exception 'A rejection reason is required'; end if;
  select * into target from public.payments where payments.id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if target.status <> 'pending' then raise exception 'Only pending payments can be rejected'; end if;
  update public.payments
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = reason
  where payments.id = target.id
  returning payments.id, payments.status, payments.created_at into id, status, created_at;
  return next;
end;
$$;

grant execute on function public.admin_list_payments(text) to authenticated;
grant execute on function public.approve_payment(uuid) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;

commit;
