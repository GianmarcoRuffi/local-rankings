import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  decimal,
  boolean,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";

export const statusEnum = pgEnum("status", ["pending", "active", "merged"]);

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    username: varchar({ length: 100 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 150 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_username").on(table.username)],
);

export const rankings = pgTable(
  "rankings",
  {
    id: serial().primaryKey(),
    name: varchar({ length: 200 }).notNull(),
    description: text(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_is_default").on(table.isDefault),
    index("idx_rankings_deleted_at").on(table.deletedAt),
    index("idx_rankings_active_name")
      .on(table.name)
      .where(isNull(table.deletedAt)),
  ],
);

export const stages = pgTable(
  "stages",
  {
    id: serial().primaryKey(),
    rankingId: integer("ranking_id").references(() => rankings.id, {
      onDelete: "cascade",
    }),
    name: varchar({ length: 200 }).notNull(),
    date: date(),
    pdfFilename: varchar("pdf_filename", { length: 255 }),
    status: statusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_status").on(table.status),
    index("idx_created_at").on(table.createdAt),
    index("idx_ranking_id").on(table.rankingId),
    index("idx_stages_deleted_at").on(table.deletedAt),
  ],
);

export const stageRanking = pgTable(
  "stage_ranking",
  {
    id: serial().primaryKey(),
    stageId: integer("stage_id")
      .notNull()
      .references(() => stages.id, {
        onDelete: "cascade",
      }),
    position: integer().notNull(),
    name: varchar({ length: 200 }).notNull(),
    score: decimal({ precision: 10, scale: 3 }),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    t1: integer().default(0),
    presenze: integer().notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_stage_id").on(table.stageId),
    index("idx_stage_position").on(table.position),
  ],
);

export const generalRanking = pgTable(
  "general_ranking",
  {
    id: serial().primaryKey(),
    rankingId: integer("ranking_id").references(() => rankings.id, {
      onDelete: "cascade",
    }),
    position: integer().default(0),
    name: varchar({ length: 200 }).notNull(),
    totalPoints: integer("total_points").notNull().default(0),
    t1: integer().default(0),
    presenze: integer().notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_total_points").on(table.totalPoints),
    index("idx_name").on(table.name),
    index("idx_general_position").on(table.position),
    index("idx_gr_ranking_id").on(table.rankingId),
    index("idx_general_ranking_deleted_at").on(table.deletedAt),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial().primaryKey(),
    username: varchar({ length: 100 }).notNull(),
    failedCount: integer("failed_count").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    lastAttempt: timestamp("last_attempt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_username_attempts").on(table.username),
    index("idx_locked_until").on(table.lockedUntil),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    token: varchar({ length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_session_token").on(table.token),
    index("idx_session_user_id").on(table.userId),
    index("idx_session_expires_at").on(table.expiresAt),
  ],
);
