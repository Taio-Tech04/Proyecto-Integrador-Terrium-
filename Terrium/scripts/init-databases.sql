-- Script de inicialización: crea todas las bases de datos necesarias
CREATE DATABASE terrium_users;
CREATE DATABASE terrium_listings;
CREATE DATABASE terrium_valuations;
CREATE DATABASE terrium_analytics;
CREATE DATABASE terrium_notifications;

-- Otorgar privilegios al usuario terrium
GRANT ALL PRIVILEGES ON DATABASE terrium_users TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_listings TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_valuations TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_analytics TO terrium;
GRANT ALL PRIVILEGES ON DATABASE terrium_notifications TO terrium;

