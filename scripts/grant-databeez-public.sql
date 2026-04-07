-- Exécuter en superutilisateur PostgreSQL (souvent rôle `postgres`) si :
-- - « permission denied for table … » (db push / migrations)
-- - « permission denied to create database » (migrate dev — base shadow)
--
-- Adapter l’utilisateur (databeez) et la base (`postgres` dans votre .env).
--
--   psql -U postgres -d postgres -f scripts/grant-databeez-public.sql
--
-- Si les tables ont été créées par `postgres`, les droits ALTER passent par GRANT ou changement de propriétaire.

GRANT USAGE ON SCHEMA public TO databeez;
GRANT CREATE ON SCHEMA public TO databeez;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO databeez;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO databeez;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO databeez;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO databeez;

-- Optionnel : permettre les migrations « dev » (création d’une base shadow) — à n’accorder qu’en machine de dev
-- ALTER ROLE databeez CREATEDB;
