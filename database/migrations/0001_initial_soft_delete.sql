-- Add deleted_at columns for soft delete functionality

-- Add deleted_at to rankings table
ALTER TABLE "rankings" ADD COLUMN "deleted_at" timestamp;
CREATE INDEX "idx_rankings_deleted_at" ON "rankings" USING btree ("deleted_at");

-- Add deleted_at to general_ranking table
ALTER TABLE "general_ranking" ADD COLUMN "deleted_at" timestamp;
CREATE INDEX "idx_general_ranking_deleted_at" ON "general_ranking" USING btree ("deleted_at");

-- Add deleted_at to stages table
ALTER TABLE "stages" ADD COLUMN "deleted_at" timestamp;
CREATE INDEX "idx_stages_deleted_at" ON "stages" USING btree ("deleted_at");
