begin;

alter table public.mentorship_packages
  add column if not exists normal_price bigint,
  add column if not exists promotion_price bigint,
  add column if not exists promotion_ends_at timestamptz;

update public.mentorship_packages
set normal_price = case slug
  when 'regular-class' then 250000
  when 'advanced-class' then 500000
  when 'master-class' then 750000
  else normal_price
end
where slug in ('regular-class', 'advanced-class', 'master-class');

-- Preserve any future/unknown package instead of assuming the catalog can only
-- contain the three packages seeded today.
update public.mentorship_packages
set normal_price = nullif(regexp_replace(price_display, '[^0-9]', '', 'g'), '')::bigint
where normal_price is null;

update public.mentorship_packages
set promotion_price = 250000,
    promotion_ends_at = timestamptz '2026-09-06 20:59:59+00'
where slug = 'master-class';

alter table public.mentorship_packages
  alter column normal_price set not null,
  drop constraint if exists mentorship_packages_normal_price_check,
  add constraint mentorship_packages_normal_price_check check (normal_price > 0),
  drop constraint if exists mentorship_packages_promotion_check,
  add constraint mentorship_packages_promotion_check check (
    (promotion_price is null and promotion_ends_at is null)
    or (
      slug = 'master-class'
      and
      promotion_price > 0
      and promotion_price < normal_price
      and promotion_ends_at is not null
    )
  );

alter table public.mentorship_applications
  add column if not exists payable_amount bigint,
  add column if not exists currency text not null default 'TZS';

alter table public.mentorship_applications
  drop constraint if exists mentorship_applications_payable_amount_check,
  add constraint mentorship_applications_payable_amount_check check (payable_amount > 0),
  drop constraint if exists mentorship_applications_currency_check,
  add constraint mentorship_applications_currency_check check (currency = 'TZS');

create or replace function public.mentorship_package_payable_amount(
  p_mentorship_package_id uuid
)
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when package.slug = 'master-class'
      and package.promotion_price is not null
      and package.promotion_ends_at is not null
      and statement_timestamp() < package.promotion_ends_at
    then package.promotion_price
    else package.normal_price
  end
  from public.mentorship_packages as package
  where package.id = p_mentorship_package_id
    and package.is_active = true;
$$;

create or replace function public.submit_mentorship_application(
  p_mentorship_package_id uuid,
  p_full_name text,
  p_email text,
  p_whatsapp_number text,
  p_country text,
  p_experience_level text,
  p_trading_duration text,
  p_biggest_challenge text,
  p_learning_goal text,
  p_preferred_schedule text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_id uuid;
  server_payable_amount bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select public.mentorship_package_payable_amount(p_mentorship_package_id)
  into server_payable_amount;
  if server_payable_amount is null then
    raise exception 'This mentorship package is currently unavailable.';
  end if;

  if exists (
    select 1
    from public.mentorship_applications as application
    where application.user_id = auth.uid()
      and application.mentorship_package_id = p_mentorship_package_id
      and application.status in ('pending', 'approved', 'waitlisted')
  ) then
    raise exception 'You already have an active application for this mentorship package';
  end if;

  insert into public.mentorship_applications (
    user_id, mentorship_package_id, full_name, email, whatsapp_number, country,
    experience_level, trading_duration, biggest_challenge, learning_goal,
    preferred_schedule, notes, status, payable_amount, currency
  ) values (
    auth.uid(), p_mentorship_package_id, trim(p_full_name), trim(p_email),
    trim(p_whatsapp_number), trim(p_country), lower(trim(p_experience_level)),
    trim(p_trading_duration), trim(p_biggest_challenge), trim(p_learning_goal),
    trim(p_preferred_schedule), nullif(trim(p_notes), ''), 'pending',
    server_payable_amount, 'TZS'
  )
  returning id into application_id;

  return application_id;
end;
$$;

revoke all on function public.mentorship_package_payable_amount(uuid) from public;
grant execute on function public.mentorship_package_payable_amount(uuid) to authenticated;
revoke insert on table public.mentorship_applications from authenticated;
grant execute on function public.submit_mentorship_application(
  uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;

commit;
