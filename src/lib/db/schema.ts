import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  date,
  mysqlEnum,
  decimal,
  boolean,
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

export const rankings = mysqlTable(
  "rankings",
  {
    id: int().autoincrement().primaryKey(),
    name: varchar({ length: 200 }).notNull().unique(),
    description: text(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_is_default").on(table.isDefault)]
);

export const stages = mysqlTable(
  "stages",
  {
    id: int().autoincrement().primaryKey(),
    rankingId: int("ranking_id"),
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
    index("idx_ranking_id").on(table.rankingId),
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
    rankingId: int("ranking_id"),
    position: int().default(0),
    name: varchar({ length: 200 }).notNull(),
    totalPoints: int("total_points").notNull().default(0),
    t1: int().default(0),
    presenze: int().notNull().default(0),
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
    index("idx_gr_ranking_id").on(table.rankingId),
  ]
);
