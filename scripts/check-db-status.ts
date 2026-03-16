import 'dotenv/config';
import { db } from '../src/lib/db';
import {
  users,
  rankings,
  stages,
  stageRanking,
  generalRanking,
} from '../src/lib/db/schema';

async function checkStatus() {
  console.log('📊 Database Status Check\n');

  const usersCount = await db.select().from(users);
  console.log(`👤 Users: ${usersCount.length}`);
  usersCount.forEach((u) =>
    console.log(`   - ${u.username} (${u.displayName})`),
  );

  const rankingsCount = await db.select().from(rankings);
  console.log(`\n🏆 Rankings: ${rankingsCount.length}`);
  rankingsCount.forEach((r) =>
    console.log(`   - ${r.name} ${r.isDefault ? '(default)' : ''}`),
  );

  const stagesCount = await db.select().from(stages);
  console.log(`\n📅 Stages: ${stagesCount.length}`);
  stagesCount.forEach((s) =>
    console.log(`   - ${s.name} (${s.date}) [${s.status}]`),
  );

  const stageRankingCount = await db.select().from(stageRanking);
  console.log(`\n📋 Stage Ranking Entries: ${stageRankingCount.length}`);

  const generalRankingCount = await db.select().from(generalRanking);
  console.log(`📊 General Ranking Entries: ${generalRankingCount.length}`);

  process.exit(0);
}

checkStatus().catch((error) => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
