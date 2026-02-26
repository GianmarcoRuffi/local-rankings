import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rankingId = searchParams.get("rankingId");

    if (rankingId) {
      // Reset only the specified ranking
      await pool.execute(
        "DELETE FROM general_ranking WHERE ranking_id = ? OR (ranking_id IS NULL AND ? = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1))",
        [rankingId, rankingId]
      );
      return NextResponse.json({ success: true, message: "Classifica azzerata" });
    } else {
      // Reset all rankings (legacy behavior)
      await pool.execute("DELETE FROM general_ranking");
      return NextResponse.json({ success: true, message: "Tutte le classifiche azzerate" });
    }
  } catch (error) {
    console.error("Error resetting general ranking:", error);
    return NextResponse.json({ error: "Failed to reset ranking" }, { status: 500 });
  }
}
