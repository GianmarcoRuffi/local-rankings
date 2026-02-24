-- Migration: Remove stages_played column from general_ranking table
-- This field is redundant with presenze column (they track the same thing)
-- Run this if you have the old schema with both columns

-- First, copy stages_played values to presenze if presenze is 0 (for existing data)
UPDATE general_ranking SET presenze = stages_played WHERE presenze = 0 AND stages_played > 0;

-- Then remove the stages_played column
ALTER TABLE general_ranking DROP COLUMN stages_played;
