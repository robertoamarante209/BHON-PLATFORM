-- BHON uses PostgreSQL exclusively through the authenticated Fastify/Prisma backend.
-- Keep the Supabase Data API roles from reading or mutating application data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

    -- Prevent future Prisma migrations from accidentally exposing new objects.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
