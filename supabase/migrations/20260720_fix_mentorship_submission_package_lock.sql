begin;

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
security invoker
set search_path = public
as $$
declare
  application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.mentorship_packages as package
    where package.id = p_mentorship_package_id
      and package.is_active = true
  ) then
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
    user_id,
    mentorship_package_id,
    full_name,
    email,
    whatsapp_number,
    country,
    experience_level,
    trading_duration,
    biggest_challenge,
    learning_goal,
    preferred_schedule,
    notes,
    status
  ) values (
    auth.uid(),
    p_mentorship_package_id,
    trim(p_full_name),
    trim(p_email),
    trim(p_whatsapp_number),
    trim(p_country),
    lower(trim(p_experience_level)),
    trim(p_trading_duration),
    trim(p_biggest_challenge),
    trim(p_learning_goal),
    trim(p_preferred_schedule),
    nullif(trim(p_notes), ''),
    'pending'
  )
  returning id into application_id;

  return application_id;
end;
$$;

grant execute on function public.submit_mentorship_application(
  uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;

commit;
