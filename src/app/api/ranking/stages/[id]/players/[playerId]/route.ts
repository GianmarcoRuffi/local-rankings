import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId } = await params;
  const body = await request.json();
  const { name, points_awarded, t1, presenze } = body;

  try {
    await pool.execute(
      "UPDATE stage_ranking SET name = ?, points_awarded = ?, t1 = ?, presenze = ? WHERE id = ?",
      [name, points_awarded, t1, presenze, playerId]
    );

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

  const { id, playerId } = await params;

  try {
    const [stageRows] = await pool.execute<RowDataPacket[]>(
      "SELECT status FROM stages WHERE id = ?",
      [id]
    );

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (stageRows[0].status !== "active") {
      return NextResponse.json(
        { error: "Impossibile eliminare giocatori da una tappa non attiva" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await connection.execute(
        "DELETE FROM stage_ranking WHERE id = ? AND stage_id = ?",
        [playerId, id]
      );

      const [remaining] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM stage_ranking WHERE stage_id = ? ORDER BY points_awarded DESC, t1 DESC",
        [id]
      );

      for (let i = 0; i < remaining.length; i++) {
        await connection.execute(
          "UPDATE stage_ranking SET position = ? WHERE id = ?",
          [i + 1, remaining[i].id]
        );
      }

      await connection.commit();
      connection.release();
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stage player:", error);
    return NextResponse.json({ error: "Failed to delete player" }, { status: 500 });
  }
}
