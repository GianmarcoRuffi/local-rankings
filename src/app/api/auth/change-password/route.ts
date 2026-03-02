import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Password attuale e nuova password sono obbligatorie" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nuova password deve essere di almeno 8 caratteri" },
      { status: 400 }
    );
  }

  try {
    const username = session.user?.email;
    if (!username) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }
    
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "La password attuale non è corretta" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Errore durante il cambio password" },
      { status: 500 }
    );
  }
}
