-- Migration: Add multiple rankings support
-- This migration adds a `rankings` table and links stages and general_ranking to it

-- Create rankings table
CREATE TABLE IF NOT EXISTS rankings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a default ranking for existing data
INSERT INTO rankings (name, description, is_default) VALUES ('Classifica Generale', 'Classifica principale', 1);

-- Add ranking_id to stages table
ALTER TABLE stages ADD COLUMN ranking_id INT NULL AFTER id;
ALTER TABLE stages ADD CONSTRAINT fk_stages_ranking FOREIGN KEY (ranking_id) REFERENCES rankings(id) ON DELETE SET NULL;
ALTER TABLE stages ADD INDEX idx_ranking_id (ranking_id);

-- Update existing stages to link to the default ranking
UPDATE stages SET ranking_id = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1) WHERE ranking_id IS NULL;

-- Add ranking_id to general_ranking table
ALTER TABLE general_ranking ADD COLUMN ranking_id INT NULL AFTER id;
ALTER TABLE general_ranking ADD CONSTRAINT fk_general_ranking_ranking FOREIGN KEY (ranking_id) REFERENCES rankings(id) ON DELETE SET NULL;
ALTER TABLE general_ranking ADD INDEX idx_gr_ranking_id (ranking_id);

-- Update existing general_ranking to link to the default ranking
UPDATE general_ranking SET ranking_id = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1) WHERE ranking_id IS NULL;

-- Remove unique constraint from name in general_ranking (names can now appear in different rankings)
-- and add a new unique constraint for (name, ranking_id)
ALTER TABLE general_ranking DROP INDEX name;
ALTER TABLE general_ranking ADD UNIQUE KEY unique_name_ranking (name, ranking_id);
