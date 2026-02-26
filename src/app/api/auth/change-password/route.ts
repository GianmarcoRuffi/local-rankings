import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  password_hash: string;
  username: string;
}

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
    const [rows] = await pool.execute<UserRow[]>(
      "SELECT id, password_hash, username FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: "La password attuale non è corretta" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      user.id,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Errore durante il cambio password" },
      { status: 500 }
    );
  }
}
