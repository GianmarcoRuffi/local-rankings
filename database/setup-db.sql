-- Setup script per creare database e utente MySQL dedicato
-- Esegui questo script come root: mysql -u root -p < database/setup-db.sql

-- Crea il database
CREATE DATABASE IF NOT EXISTS local_rankings
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Crea l'utente MySQL per l'applicazione (cambia la password se vuoi)
CREATE USER IF NOT EXISTS 'local_rankings_user'@'localhost' IDENTIFIED BY 'local_rankings_password';

-- Dà tutti i permessi sull'intero database all'utente
GRANT ALL PRIVILEGES ON local_rankings.* TO 'local_rankings_user'@'localhost';

-- Applica le modifiche
FLUSH PRIVILEGES;

-- Mostra conferma
SELECT 'Database e utente MySQL creati con successo!' as Status;
SELECT 'Username: local_rankings_user' as Info;
SELECT 'Password: local_rankings_password' as Info;
SELECT 'Database: local_rankings' as Info;
