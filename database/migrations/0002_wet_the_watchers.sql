ALTER TABLE "login_attempts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "login_attempts" CASCADE;--> statement-breakpoint
ALTER TABLE "rankings" DROP CONSTRAINT "rankings_name_unique";--> statement-breakpoint
ALTER TABLE "general_ranking" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rankings" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_general_ranking_deleted_at" ON "general_ranking" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_rankings_deleted_at" ON "rankings" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_rankings_active_name" ON "rankings" USING btree ("name") WHERE "rankings"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_stages_deleted_at" ON "stages" USING btree ("deleted_at");