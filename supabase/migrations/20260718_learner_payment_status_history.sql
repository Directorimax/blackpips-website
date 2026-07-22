begin;

alter table public.payments enable row level security;

drop policy if exists "Users can view their own payments" on public.payments;
create policy "Users can view their own payments" on public.payments
for select to authenticated
using (user_id = auth.uid());

-- Learners submit payment records but may never alter review-controlled fields.
-- Admin review continues through SECURITY DEFINER RPCs.
revoke update on public.payments from authenticated;

commit;
