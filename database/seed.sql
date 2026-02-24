-- Seed data for Local Rankings
-- Run after schema.sql

USE local_rankings;

-- Default admin user (password: admin123)
-- Generate with: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10))"
INSERT INTO users (username, password_hash, display_name) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amministratore')
ON DUPLICATE KEY UPDATE username = username;

-- Mock stages
INSERT INTO stages (name, date, status) VALUES
('Tappa 1 - Milano', '2024-01-15', 'merged'),
('Tappa 2 - Roma', '2024-02-20', 'merged'),
('Tappa 3 - Napoli', '2024-03-10', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Mock stage_ranking for Tappa 1 (stage_id = 1)
INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES
(1, 1, 'Mario Rossi', 95.5, 25, 0, 1),
(1, 2, 'Luigi Bianchi', 88.0, 18, 2, 1),
(1, 3, 'Giuseppe Verdi', 82.3, 15, -1, 1),
(1, 4, 'Anna Neri', 75.0, 12, 0, 1),
(1, 5, 'Marco Colombo', 70.5, 10, 1, 1),
(1, 6, 'Laura Ferrari', 65.0, 8, 0, 1),
(1, 7, 'Paolo Conti', 60.0, 6, -2, 1),
(1, 8, 'Giulia Romano', 55.5, 4, 0, 1),
(1, 9, 'Andrea Ricci', 50.0, 2, 0, 1),
(1, 10, 'Francesca Esposito', 45.0, 1, 0, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Mock stage_ranking for Tappa 2 (stage_id = 2)
INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES
(2, 1, 'Luigi Bianchi', 92.0, 25, 1, 1),
(2, 2, 'Mario Rossi', 90.5, 18, 0, 1),
(2, 3, 'Laura Ferrari', 85.0, 15, 0, 1),
(2, 4, 'Giuseppe Verdi', 80.0, 12, 0, 1),
(2, 5, 'Davide Barbieri', 78.5, 10, 0, 1),
(2, 6, 'Anna Neri', 72.0, 8, 0, 1),
(2, 7, 'Sara Rizzo', 68.0, 6, 1, 1),
(2, 8, 'Marco Colombo', 62.0, 4, 0, 1),
(2, 9, 'Matteo Ferrari', 58.0, 2, 0, 1),
(2, 10, 'Elisa Costa', 52.0, 1, -1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Mock stage_ranking for Tappa 3 (stage_id = 3) - ACTIVE, not merged yet
INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES
(3, 1, 'Giuseppe Verdi', 98.0, 25, 0, 1),
(3, 2, 'Sara Rizzo', 94.5, 18, 1, 1),
(3, 3, 'Mario Rossi', 91.0, 15, 0, 1),
(3, 4, 'Davide Barbieri', 87.0, 12, 0, 1),
(3, 5, 'Luigi Bianchi', 83.5, 10, 0, 1),
(3, 6, 'Chiara Lombardi', 79.0, 8, 0, 1),
(3, 7, 'Laura Ferrari', 74.5, 6, -1, 1),
(3, 8, 'Simone Fontana', 69.0, 4, 0, 1),
(3, 9, 'Martina Santoro', 64.0, 2, 0, 1),
(3, 10, 'Alessandro Martini', 59.0, 1, 0, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Mock general_ranking (accumulated from merged stages 1 and 2)
INSERT INTO general_ranking (position, name, total_points, t1, presenze) VALUES
(1, 'Mario Rossi', 43, 0, 2),
(2, 'Luigi Bianchi', 43, 3, 2),
(3, 'Giuseppe Verdi', 27, -1, 2),
(4, 'Laura Ferrari', 23, 0, 2),
(5, 'Anna Neri', 20, 0, 2),
(6, 'Marco Colombo', 14, 1, 2),
(7, 'Davide Barbieri', 10, 0, 1),
(8, 'Paolo Conti', 6, -2, 1),
(9, 'Sara Rizzo', 6, 1, 1),
(10, 'Giulia Romano', 4, 0, 1),
(11, 'Andrea Ricci', 2, 0, 1),
(12, 'Francesca Esposito', 1, 0, 1),
(13, 'Matteo Ferrari', 2, 0, 1),
(14, 'Elisa Costa', 1, -1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);
