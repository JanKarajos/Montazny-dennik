-- Supabase sprístupňuje schému "public" cez PostgREST (anon / authenticated roly).
-- Aplikácia pristupuje k databáze výhradne cez Prisma ako vlastník tabuliek,
-- ktorý RLS obchádza, preto zapnutie RLS bez politík zablokuje iba verejné API.
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "WorkLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_RolePermissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_UserPermissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Druhá vrstva ochrany: odobratie práv verejným Supabase rolám (ak existujú).
DO $$
DECLARE
  api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
