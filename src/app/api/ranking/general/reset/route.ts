import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generalRanking } from "@/lib/db/schema";
import { eq, or, and, isNull, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rankingIdStr = searchParams.get("rankingId");
    const rankingId = rankingIdStr ? parseInt(rankingIdStr) : null;

    if (rankingId) {
      // Reset only the specified ranking
      await db
        .delete(generalRanking)
        .where(
          or(
            eq(generalRanking.rankingId, rankingId),
            and(
              isNull(generalRanking.rankingId),
              sql`${rankingId} = (SELECT id FROM rankings WHERE is_default = true LIMIT 1)`
            )
          )
        );
      return NextResponse.json({ success: true, message: "Classifica azzerata" });
    } else {
      // Reset all rankings (legacy behavior)
      await db.delete(generalRanking);
      return NextResponse.json({ success: true, message: "Tutte le classifiche azzerate" });
    }
  } catch (error) {
    console.error("Error resetting general ranking:", error);
    return NextResponse.json({ error: "Failed to reset ranking" }, { status: 500 });
  }
}
