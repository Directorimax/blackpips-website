create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,

    amount numeric(10,2) not null,
    currency text default 'TZS',

    payment_method text,
    provider text,

    transaction_id text unique,
    provider_reference text,
    proof_url text,

    status text not null default 'pending'
        check (status in ('pending','paid','failed','cancelled')),

    paid_at timestamptz,

    created_at timestamptz default now()
);
alter table public.payments enable row level security;

create policy "Users can view their own payments"
on public.payments
for select
using (auth.uid() = user_id);

create policy "Users can insert their own payments"
on public.payments
for insert
with check (auth.uid() = user_id);
