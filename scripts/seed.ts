import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

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
    console.log('Admin user created with username "admin"');
  } else {
    await db
      .update(users)
      .set({ passwordHash, displayName: 'Amministratore' })
      .where(eq(users.username, 'admin'));
    console.log('Admin user updated with username "admin"');
  }

  console.log('Seed completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
