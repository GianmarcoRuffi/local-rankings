import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  date,
  mysqlEnum,
  decimal,
  text,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int().autoincrement().primaryKey(),
    username: varchar({ length: 100 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 150 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_username").on(table.username)]
);

export const stages = mysqlTable(
  "stages",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 200 }).notNull(),
    date: date(),
    pdfFilename: varchar("pdf_filename", { length: 255 }),
    status: mysqlEnum("status", ["pending", "active", "merged"])
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_status").on(table.status),
    index("idx_created_at").on(table.createdAt),
  ]
);

export const stageRanking = mysqlTable(
  "stage_ranking",
  {
    id: int().autoincrement().primaryKey(),
    stageId: int("stage_id").notNull(),
    position: int().notNull(),
    name: varchar({ length: 200 }).notNull(),
    score: decimal({ precision: 10, scale: 3 }),
    pointsAwarded: int("points_awarded").notNull().default(0),
    t1: int().default(0),
    presenze: int().notNull().default(1),
    rawData: text("raw_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_stage_id").on(table.stageId),
    index("idx_position").on(table.position),
  ]
);

export const generalRanking = mysqlTable(
  "general_ranking",
  {
    id: int().autoincrement().primaryKey(),
    position: int().default(0),
    name: varchar({ length: 200 }).notNull().unique(),
    totalPoints: int("total_points").notNull().default(0),
    t1: int().default(0),
    presenze: int().notNull().default(0),
    stagesPlayed: int("stages_played").notNull().default(0),
    bestResults: text("best_results"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_total_points").on(table.totalPoints),
    index("idx_name").on(table.name),
    index("idx_position").on(table.position),
  ]
);
