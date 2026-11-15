ALTER TABLE rankings ADD COLUMN deletion_group varchar(36);
--> statement-breakpoint
ALTER TABLE stages ADD COLUMN deletion_group varchar(36);
--> statement-breakpoint
ALTER TABLE general_ranking ADD COLUMN deletion_group varchar(36);
