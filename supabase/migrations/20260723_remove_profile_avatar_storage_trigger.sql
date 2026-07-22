begin;

-- Supabase Storage objects must be changed through the Storage API, never by
-- application triggers issuing DML against storage.objects.
drop trigger if exists profiles_cleanup_replaced_avatar on public.profiles;
drop function if exists public.cleanup_replaced_profile_avatar();

commit;
