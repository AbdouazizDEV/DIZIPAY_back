-- À exécuter en SUPERUTILISATEUR PostgreSQL (ex. -U postgres), une seule fois,
-- si `npx prisma db push` échoue avec : permission denied for table users
-- (tables créées par un autre rôle, ex. postgres).
--
-- Remplace la propriété des tables + séquences du schéma public par l’utilisateur
-- applicatif (adapter databeez si besoin).
--
--   export PGPASSWORD='...' && psql -U postgres -h 127.0.0.1 -d postgres -f scripts/postgres-owner-databeez-public.sql

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename AS name
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO databeez', r.name);
  END LOOP;

  FOR r IN
    SELECT sequence_name AS name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO databeez', r.name);
  END LOOP;
END $$;
