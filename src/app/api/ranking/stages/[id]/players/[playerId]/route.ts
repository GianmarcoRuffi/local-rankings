import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stages, stageRanking } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: stageIdParam, playerId } = await params;
  const stageId = parseInt(stageIdParam, 10);
  const id = parseInt(playerId, 10);

  if (Number.isNaN(stageId) || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid stage/player id" }, { status: 400 });
  }

  const body = await request.json();
  const { name, points_awarded, t1, presenze } = body;

  try {
    const stageRows = await db
      .select({ status: stages.status })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (stageRows[0].status !== "active") {
      return NextResponse.json(
        { error: "Impossibile modificare giocatori di una tappa non attiva" },
        { status: 400 }
      );
    }

    const updatedRows = await db
      .update(stageRanking)
      .set({
        name,
        pointsAwarded: points_awarded,
        t1,
        presenze,
      })
      .where(and(eq(stageRanking.id, id), eq(stageRanking.stageId, stageId)))
      .returning({ id: stageRanking.id });

    if (updatedRows.length === 0) {
      return NextResponse.json({ error: "Player not found in stage" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating stage ranking player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: stageIdStr, playerId: playerIdStr } = await params;
  const stageId = parseInt(stageIdStr);
  const playerId = parseInt(playerIdStr);

  try {
    const stageRows = await db
      .select({ status: stages.status })
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (stageRows[0].status !== "active") {
      return NextResponse.json(
        { error: "Impossibile eliminare giocatori da una tappa non attiva" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(stageRanking)
        .where(and(eq(stageRanking.id, playerId), eq(stageRanking.stageId, stageId)));

      const remaining = await tx
        .select({ id: stageRanking.id })
        .from(stageRanking)
        .where(eq(stageRanking.stageId, stageId))
        .orderBy(desc(stageRanking.pointsAwarded), desc(stageRanking.t1));

      for (let i = 0; i < remaining.length; i++) {
        await tx
          .update(stageRanking)
          .set({ position: i + 1 })
          .where(eq(stageRanking.id, remaining[i].id));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stage player:", error);
    return NextResponse.json({ error: "Failed to delete player" }, { status: 500 });
  }
}
