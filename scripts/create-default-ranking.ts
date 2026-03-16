import 'dotenv/config';
import { db } from '../src/lib/db';
import { rankings } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function createDefaultRanking() {
  const name = 'Classifica Generale';
  const description = 'Classifica generale del torneo';

  const existing = await db
    .select()
    .from(rankings)
    .where(eq(rankings.isDefault, true))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(rankings).values({
      name,
      description,
      isDefault: true,
    });
    console.log(`Default ranking "${name}" created successfully`);
  } else {
    console.log(`Default ranking already exists: "${existing[0].name}"`);
  }

  process.exit(0);
}

createDefaultRanking().catch((error) => {
  console.error('Failed to create default ranking:', error);
  process.exit(1);
});
