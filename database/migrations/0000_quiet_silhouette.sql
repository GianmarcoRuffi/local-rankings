CREATE TYPE "public"."status" AS ENUM('pending', 'active', 'merged');--> statement-breakpoint
CREATE TABLE "general_ranking" (
	"id" serial PRIMARY KEY NOT NULL,
	"ranking_id" integer,
	"position" integer DEFAULT 0,
	"name" varchar(200) NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"t1" integer DEFAULT 0,
	"presenze" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rankings_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stage_ranking" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"position" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"score" numeric(10, 3),
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"t1" integer DEFAULT 0,
	"presenze" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ranking_id" integer,
	"name" varchar(200) NOT NULL,
	"date" date,
	"pdf_filename" varchar(255),
	"status" "status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(150) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE INDEX "idx_total_points" ON "general_ranking" USING btree ("total_points");--> statement-breakpoint
CREATE INDEX "idx_name" ON "general_ranking" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_general_position" ON "general_ranking" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_gr_ranking_id" ON "general_ranking" USING btree ("ranking_id");--> statement-breakpoint
CREATE INDEX "idx_is_default" ON "rankings" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_stage_id" ON "stage_ranking" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_stage_position" ON "stage_ranking" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_status" ON "stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_created_at" ON "stages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ranking_id" ON "stages" USING btree ("ranking_id");--> statement-breakpoint
CREATE INDEX "idx_username" ON "users" USING btree ("username");