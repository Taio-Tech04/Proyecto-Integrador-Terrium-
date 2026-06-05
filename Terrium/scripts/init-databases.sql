-- Script de inicializacion: crea todas las bases de datos necesarias
-- El usuario 'terrium' ya existe (creado por POSTGRES_USER en docker-compose)

SELECT 'CREATE DATABASE terrium_users'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'terrium_users')\gexec

SELECT 'CREATE DATABASE terrium_listings'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'terrium_listings')\gexec

SELECT 'CREATE DATABASE terrium_valuations'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'terrium_valuations')\gexec

SELECT 'CREATE DATABASE terrium_analytics'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'terrium_analytics')\gexec

SELECT 'CREATE DATABASE terrium_notifications'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'terrium_notifications')\gexec

GRANT ALL PRIVILEGES ON DATABASE terrium_users         TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_listings      TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_valuations    TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_analytics     TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_notifications TO terrium;
