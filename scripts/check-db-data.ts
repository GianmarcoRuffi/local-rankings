import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  generalRanking,
  rankings,
  stages,
  stageRanking,
} from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function checkData() {
  console.log("🔍 Checking database tables...\n");

  try {
    // Check rankings table
    const rankingsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(rankings);
    console.log(`📊 Rankings: ${rankingsCount[0].count} records`);

    // Check general_ranking table
    const generalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(generalRanking);
    console.log(`🏆 General Ranking: ${generalCount[0].count} records`);

    // Check stages table
    const stagesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(stages);
    console.log(`📋 Stages: ${stagesCount[0].count} records`);

    // Check stage_ranking table
    const stageRankingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(stageRanking);
    console.log(`🎯 Stage Ranking: ${stageRankingCount[0].count} records`);

    // Check for orphaned records (should be 0 after foreign key cascade)
    const orphanedGeneral = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM general_ranking gr
      WHERE gr.ranking_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM rankings r WHERE r.id = gr.ranking_id)
    `);
    console.log(
      `\n⚠️  Orphaned general_ranking records: ${orphanedGeneral.rows[0].count}`,
    );

    // Sample of general ranking data
    if (generalCount[0].count > 0) {
      console.log("\n📝 Sample of general_ranking data:");
      const sample = await db.select().from(generalRanking).limit(5);
      sample.forEach((row) => {
        console.log(
          `  - ${row.name}: ${row.totalPoints} points, ranking_id: ${row.rankingId}`,
        );
      });
    } else {
      console.log("\n❌ NO DATA in general_ranking table!");
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.end();
    process.exit(1);
  }
}

checkData();
