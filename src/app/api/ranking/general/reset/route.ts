import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await pool.execute("DELETE FROM general_ranking");
    return NextResponse.json({ success: true, message: "Classifica generale azzerata" });
  } catch (error) {
    console.error("Error resetting general ranking:", error);
    return NextResponse.json({ error: "Failed to reset ranking" }, { status: 500 });
  }
}
