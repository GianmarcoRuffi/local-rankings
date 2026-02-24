-- Migration: Add presenze column to stage_ranking and general_ranking tables
-- Run this if the tables already exist without the presenze column

-- Add presenze column to stage_ranking if it doesn't exist
-- Default is 1 because a player in a stage has 1 presence
ALTER TABLE stage_ranking ADD COLUMN presenze INT NOT NULL DEFAULT 1;

-- Add presenze column to general_ranking if it doesn't exist
-- Default is 0 because it accumulates with merges
ALTER TABLE general_ranking ADD COLUMN presenze INT NOT NULL DEFAULT 0;
