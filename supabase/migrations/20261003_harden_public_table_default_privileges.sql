begin;

-- Application migrations are normally applied as postgres, while Supabase
-- maintenance can create public objects as supabase_admin. Keep the owner and
-- service-role defaults intact, but require future public tables to grant
-- mobile roles explicitly in the migration that creates each table.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke all privileges on tables from anon, authenticated;

commit;
