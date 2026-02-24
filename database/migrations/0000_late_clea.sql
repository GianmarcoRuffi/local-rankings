CREATE TABLE `general_ranking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`total_points` int NOT NULL DEFAULT 0,
	`stages_played` int NOT NULL DEFAULT 0,
	`best_results` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `general_ranking_id` PRIMARY KEY(`id`),
	CONSTRAINT `general_ranking_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `stage_ranking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stage_id` int NOT NULL,
	`position` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`score` decimal(10,3),
	`points_awarded` int NOT NULL DEFAULT 0,
	`raw_data` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stage_ranking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`date` date,
	`pdf_filename` varchar(255),
	`status` enum('pending','active','merged') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`display_name` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `idx_total_points` ON `general_ranking` (`total_points`);--> statement-breakpoint
CREATE INDEX `idx_name` ON `general_ranking` (`name`);--> statement-breakpoint
CREATE INDEX `idx_stage_id` ON `stage_ranking` (`stage_id`);--> statement-breakpoint
CREATE INDEX `idx_position` ON `stage_ranking` (`position`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `stages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `stages` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_username` ON `users` (`username`);