DO $$ BEGIN
    ALTER TABLE "rankings" DROP CONSTRAINT "rankings_name_unique";
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "general_ranking" ADD COLUMN "deleted_at" timestamp;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "rankings" ADD COLUMN "deleted_at" timestamp;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "stages" ADD COLUMN "deleted_at" timestamp;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_general_ranking_deleted_at" ON "general_ranking" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rankings_deleted_at" ON "rankings" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rankings_active_name" ON "rankings" USING btree ("name") WHERE "rankings"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stages_deleted_at" ON "stages" USING btree ("deleted_at");