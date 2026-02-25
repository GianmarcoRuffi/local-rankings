import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import {
  users,
  stages,
  stageRanking,
  generalRanking,
} from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const PLAYER_NAMES = [
  'Mario Rossi',
  'Luigi Bianchi',
  'Giuseppe Verdi',
  'Anna Neri',
  'Marco Colombo',
  'Laura Ferrari',
  'Paolo Conti',
  'Giulia Romano',
  'Andrea Ricci',
  'Francesca Esposito',
  'Luca Moretti',
  'Chiara Lombardi',
  'Davide Barbieri',
  'Sara Rizzo',
  'Matteo Ferrari',
  'Elisa Costa',
  'Simone Fontana',
  'Martina Santoro',
  'Alessandro Martini',
  'Valentina Orlando',
];

const POINTS_TABLE: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

function getRandomT1(): number {
  const rand = Math.random();
  if (rand < 0.3) return 0;
  if (rand < 0.5) return Math.floor(Math.random() * 5) + 1;
  return -(Math.floor(Math.random() * 5) + 1);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function seed() {
  console.log('🌱 Starting mock data seed...');

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, 'admin'))
    .limit(1);

  if (existingUser.length === 0) {
    await db.insert(users).values({
      username: 'admin',
      passwordHash,
      displayName: 'Amministratore',
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  const existingStages = await db.select().from(stages);
  if (existingStages.length > 0) {
    console.log('⚠️  Stages already exist. Skipping mock data.');
    console.log("   Run 'npm run db:reset' first to clear the database.");
    process.exit(0);
  }

  console.log('📊 Creating mock stages...');

  const mockStages = [
    { name: 'Tappa 1 - Milano', date: '2024-01-15' },
    { name: 'Tappa 2 - Roma', date: '2024-02-20' },
    { name: 'Tappa 3 - Napoli', date: '2024-03-10' },
  ];

  for (let i = 0; i < mockStages.length; i++) {
    const stageData = mockStages[i];
    const shuffledPlayers = shuffleArray(PLAYER_NAMES);
    const numPlayers = Math.floor(Math.random() * 6) + 10;

    const result = await db
      .insert(stages)
      .values({
        name: stageData.name,
        date: new Date(stageData.date),
        status: i < mockStages.length - 1 ? 'merged' : 'active',
      })
      .$returningId();

    const stageId = result[0].id;

    console.log(`  ✓ Created stage: ${stageData.name} (${numPlayers} players)`);

    for (let pos = 1; pos <= numPlayers; pos++) {
      const playerName = shuffledPlayers[pos - 1];
      const points = POINTS_TABLE[pos] ?? 0;
      const t1 = getRandomT1();
      const scoreValue =
        Math.random() > 0.5
          ? (Math.round(Math.random() * 1000) / 10).toFixed(1)
          : null;

      await db.insert(stageRanking).values({
        stageId,
        position: pos,
        name: playerName,
        score: scoreValue,
        pointsAwarded: points,
        t1,
        presenze: 1,
      });
    }

    if (i < mockStages.length - 1) {
      const stagePlayers = await db
        .select()
        .from(stageRanking)
        .where(eq(stageRanking.stageId, stageId));

      for (const player of stagePlayers) {
        const existingRanking = await db
          .select()
          .from(generalRanking)
          .where(eq(generalRanking.name, player.name))
          .limit(1);

        if (existingRanking.length > 0) {
          const existing = existingRanking[0];
          await db
            .update(generalRanking)
            .set({
              totalPoints: existing.totalPoints + player.pointsAwarded,
              t1: (existing.t1 ?? 0) + (player.t1 ?? 0),
              presenze: existing.presenze + 1,
            })
            .where(eq(generalRanking.id, existing.id));
        } else {
          await db.insert(generalRanking).values({
            name: player.name,
            totalPoints: player.pointsAwarded,
            t1: player.t1 ?? 0,
            presenze: 1,
          });
        }
      }
    }
  }

  console.log('✅ Mock data seed completed!');
  console.log('');
  console.log('📋 Summary:');
  console.log('   - 3 stages created (2 merged, 1 active)');
  console.log('   - ~30 players in stage_ranking');
  console.log('   - ~20 players in general_ranking');
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
