ALTER TABLE "general_ranking" ADD COLUMN "trash_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rankings" ADD COLUMN "trash_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "trash_expires_at" timestamp with time zone;
--> statement-breakpoint
UPDATE rankings SET trash_expires_at = CURRENT_TIMESTAMP + INTERVAL '5 days' WHERE deleted_at IS NOT NULL AND trash_expires_at IS NULL;
--> statement-breakpoint
UPDATE stages SET trash_expires_at = CURRENT_TIMESTAMP + INTERVAL '5 days' WHERE deleted_at IS NOT NULL AND trash_expires_at IS NULL;
--> statement-breakpoint
UPDATE general_ranking SET trash_expires_at = CURRENT_TIMESTAMP + INTERVAL '5 days' WHERE deleted_at IS NOT NULL AND trash_expires_at IS NULL;