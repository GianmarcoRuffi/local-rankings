import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { sortRanking } from "@/lib/ranking-logic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { stageId } = body;

  if (!stageId) {
    return NextResponse.json({ error: "stageId is required" }, { status: 400 });
  }

  try {
    const [stageRows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM stages WHERE id = ?",
      [stageId]
    );

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const stage = stageRows[0];

    if (stage.status !== "merged") {
      return NextResponse.json({ error: "This stage has not been merged" }, { status: 409 });
    }

    const [stagePlayers] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM stage_ranking WHERE stage_id = ? ORDER BY position ASC",
      [stageId]
    );

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (const player of stagePlayers) {
        const [existing] = await connection.execute<RowDataPacket[]>(
          "SELECT id, total_points, t1, presenze FROM general_ranking WHERE LOWER(name) = LOWER(?)",
          [player.name]
        );

        if (existing.length > 0) {
          const current = existing[0];
          const newPoints = current.total_points - (player.points_awarded || 0);
          const newT1 = (current.t1 || 0) - (player.t1 || 0);
          const newPresenze = (current.presenze || 0) - (player.presenze || 1);

          if (newPoints <= 0 && newT1 === 0 && newPresenze <= 0) {
            await connection.execute(
              "DELETE FROM general_ranking WHERE id = ?",
              [current.id]
            );
          } else {
            await connection.execute(
              "UPDATE general_ranking SET total_points = ?, t1 = ?, presenze = ?, updated_at = NOW() WHERE id = ?",
              [Math.max(0, newPoints), newT1, Math.max(0, newPresenze), current.id]
            );
          }
        }
      }

      await connection.execute(
        "UPDATE stages SET status = 'active', updated_at = NOW() WHERE id = ?",
        [stageId]
      );

      const [allPlayers] = await connection.execute<RowDataPacket[]>(
        "SELECT id, total_points, t1 FROM general_ranking"
      );

      if (allPlayers.length > 0) {
        const sorted = sortRanking(
          allPlayers.map((p) => ({
            id: p.id,
            total_points: p.total_points,
            t1: p.t1 || 0,
          }))
        );

        for (let i = 0; i < sorted.length; i++) {
          await connection.execute(
            "UPDATE general_ranking SET position = ? WHERE id = ?",
            [i + 1, sorted[i].id]
          );
        }
      }

      await connection.commit();
      connection.release();

      return NextResponse.json({
        success: true,
        message: `Merge della tappa "${stage.name}" annullato`,
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error reverting merge:", error);
    return NextResponse.json({ error: "Failed to revert merge" }, { status: 500 });
  }
}
