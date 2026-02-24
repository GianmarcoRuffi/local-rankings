import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function createUser() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "admin123";
  const displayName = process.argv[4] || "Amministratore";

  const hash = await bcrypt.hash(password, 10);

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUser.length === 0) {
    await db.insert(users).values({
      username,
      passwordHash: hash,
      displayName,
    });
    console.log(`User "${username}" created successfully`);
  } else {
    await db
      .update(users)
      .set({ passwordHash: hash, displayName })
      .where(eq(users.username, username));
    console.log(`User "${username}" updated successfully`);
  }

  process.exit(0);
}

createUser().catch((error) => {
  console.error("Failed to create user:", error);
  process.exit(1);
});
