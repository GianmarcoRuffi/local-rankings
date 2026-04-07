import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { stages, stageRanking } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { toPositiveInt } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await params;
  const stageId = toPositiveInt(id);

  if (!stageId) {
    return NextResponse.json({ error: "Invalid stage id" }, { status: 400 });
  }

  const body = await request.json();
  const { name, date, ranking_id } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

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
        { error: "Impossibile modificare una tappa non attiva" },
        { status: 400 },
      );
    }

    await db
      .update(stages)
      .set({
        name,
        date: date ? new Date(date).toISOString().split("T")[0] : null,
        rankingId: ranking_id ? parseInt(ranking_id) : null,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error updating stage:", { error });
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stageId = toPositiveInt(id);

  if (!stageId) {
    return NextResponse.json({ error: "Invalid stage id" }, { status: 400 });
  }

  try {
    const players = await db
      .select()
      .from(stageRanking)
      .where(eq(stageRanking.stageId, stageId))
      .orderBy(stageRanking.position);
    return NextResponse.json(players);
  } catch (error) {
    logger.error("Error fetching stage ranking:", { error });
    return NextResponse.json(
      { error: "Failed to fetch stage ranking" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await params;
  const stageId = toPositiveInt(id);

  if (!stageId) {
    return NextResponse.json({ error: "Invalid stage id" }, { status: 400 });
  }

  try {
    const stageRows = await db
      .select()
      .from(stages)
      .where(eq(stages.id, stageId))
      .limit(1);

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(stageRanking).where(eq(stageRanking.stageId, stageId));
      await tx.delete(stages).where(eq(stages.id, stageId));
    });

    return NextResponse.json({ success: true, message: "Tappa eliminata" });
  } catch (error) {
    logger.error("Error deleting stage:", { error });
    return NextResponse.json(
      { error: "Failed to delete stage" },
      { status: 500 },
    );
  }
}
