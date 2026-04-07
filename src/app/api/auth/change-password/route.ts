import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { logger } from "@/lib/logger";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const body = await request.json();
  const parsedBody = changePasswordSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Password attuale e nuova password sono obbligatorie" },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsedBody.data;

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "La nuova password deve essere diversa da quella attuale" },
      { status: 400 },
    );
  }

  try {
    const username = auth.username;
    if (!username) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 },
      );
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 },
      );
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "La password attuale non è corretta" },
        { status: 400 },
      );
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to change password", {
      username: auth.username,
      error,
    });
    return NextResponse.json(
      { error: "Errore durante il cambio password" },
      { status: 500 },
    );
  }
}
