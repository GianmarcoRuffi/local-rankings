-- Migration: Add t1 column to stage_ranking and general_ranking tables
-- Run this if the tables already exist without the t1 column

-- Add t1 column to stage_ranking if it doesn't exist
ALTER TABLE stage_ranking ADD COLUMN IF NOT EXISTS t1 INT DEFAULT 0;

-- Add t1 column to general_ranking if it doesn't exist
ALTER TABLE general_ranking ADD COLUMN IF NOT EXISTS t1 INT DEFAULT 0;

-- Add position column to general_ranking if it doesn't exist
ALTER TABLE general_ranking ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;

-- Update positions based on current ranking
SET @pos = 0;
UPDATE general_ranking 
SET position = (@pos := @pos + 1) 
ORDER BY total_points DESC;
