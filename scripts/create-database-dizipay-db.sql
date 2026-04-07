-- =============================================================================
-- OBLIGATOIRE : se connecter en SUPERUTILISATEUR (ex. -U postgres), PAS en databeez.
-- =============================================================================
-- Si vous êtes connecté en `databeez`, `CREATE DATABASE` et `ALTER ROLE databeez ...`
-- échouent : seul un superuser (ou un rôle avec CREATEROLE + droits admin sur
-- databeez) peut créer une base ou modifier un autre rôle.
--
-- 1) Crée la base `dizipay_db` (sinon : erreur P1003 « database does not exist »).
-- 2) Accorde CREATEDB à `databeez` pour que `npx prisma db push` puisse créer la
--    base « shadow » du moteur Prisma (sinon : « permission denied to create database »).
--
-- Exemple (mot de passe du compte système `postgres`, pas celui de databeez) :
--   export PGPASSWORD='<mot_de_passe_postgres>'
--   psql -U postgres -h 127.0.0.1 -d postgres -f scripts/create-database-dizipay-db.sql
--
-- Si vous n’avez pas le mot de passe postgres : sudo -u postgres psql (en local),
-- ou demander à l’administrateur du serveur d’exécuter ce fichier.
--
-- Si `dizipay_db` existe déjà : commentez le bloc CREATE DATABASE ci-dessous.
-- =============================================================================

CREATE DATABASE dizipay_db
  OWNER databeez
  ENCODING 'UTF8'
  TEMPLATE template0;

-- Développement uniquement : nécessaire pour prisma db push / migrate (shadow DB).
-- À retirer ou révoquer en prod si votre politique de sécurité l’exige.
ALTER ROLE databeez CREATEDB;
