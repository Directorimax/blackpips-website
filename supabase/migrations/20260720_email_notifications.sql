begin;

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'welcome',
    'payment_approved',
    'course_unlocked',
    'mentorship_approved',
    'mentorship_rejected',
    'certificate_earned'
  )),
  resource_id uuid not null,
  recipient_email text not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, resource_id)
);

create index if not exists email_notifications_status_created_idx
  on public.email_notifications (status, created_at desc);

alter table public.email_notifications enable row level security;

-- Delivery logs are written exclusively by the server-side service-role client.
-- No browser role receives a policy, so recipients and provider errors stay private.

commit;
