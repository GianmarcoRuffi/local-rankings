-- Migration: remove unused columns
-- Remove raw_data from stage_ranking
ALTER TABLE stage_ranking DROP COLUMN IF EXISTS raw_data;

-- Remove best_results from general_ranking
ALTER TABLE general_ranking DROP COLUMN IF EXISTS best_results;
