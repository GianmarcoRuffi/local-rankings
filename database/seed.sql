-- Seed data for Local Rankings
-- Run after schema.sql

USE local_rankings;

-- Default admin user (password: admin123)
-- Generate with: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10))"
INSERT INTO users (username, password_hash, display_name) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amministratore')
ON DUPLICATE KEY UPDATE username = username;
