begin;

-- Keep profile creation inside the database so every auth.users signup,
-- including OAuth, receives the standard student role automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(new.email, ''),
      'Learner'
    ),
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- The existing profiles table stores the person name in full_name. This
-- insert is deliberately non-destructive: an existing admin profile is kept.
insert into public.profiles (id, full_name, role)
values ('ee8f3576-a32e-4dc0-b31d-e4d44d56b7a3', 'Black Pips', 'admin')
on conflict (id) do nothing;

commit;
