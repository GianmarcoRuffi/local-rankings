import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { sortRanking } from "@/lib/ranking-logic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { stageId } = body;

    if (!stageId) {
      return NextResponse.json(
        { error: "stageId is required" },
        { status: 400 }
      );
    }

    const [stageRows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM stages WHERE id = ?",
      [stageId]
    );

    if (stageRows.length === 0) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const stage = stageRows[0];

    if (stage.status === "merged") {
      return NextResponse.json(
        { error: "This stage has already been merged" },
        { status: 409 }
      );
    }

    // Get the ranking_id from the stage
    let rankingId = stage.ranking_id;
    if (!rankingId) {
      const [defaultRanking] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM rankings WHERE is_default = 1 LIMIT 1"
      );
      if (defaultRanking.length > 0) {
        rankingId = defaultRanking[0].id;
      }
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
          "SELECT id, total_points, t1, presenze FROM general_ranking WHERE LOWER(name) = LOWER(?) AND (ranking_id = ? OR (ranking_id IS NULL AND ? = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1)))",
          [player.name, rankingId, rankingId]
        );

        if (existing.length > 0) {
          const current = existing[0];
          await connection.execute(
            "UPDATE general_ranking SET total_points = total_points + ?, t1 = t1 + ?, presenze = presenze + ?, updated_at = NOW() WHERE id = ?",
            [player.points_awarded, player.t1 || 0, player.presenze || 1, current.id]
          );
        } else {
          await connection.execute<ResultSetHeader>(
            "INSERT INTO general_ranking (name, ranking_id, total_points, t1, presenze, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
            [player.name, rankingId, player.points_awarded, player.t1 || 0, player.presenze || 1]
          );
        }
      }

      await connection.execute(
        "UPDATE stages SET status = 'merged', updated_at = NOW() WHERE id = ?",
        [stageId]
      );

      // Riordina la classifica generale per questo ranking
      const [allPlayers] = await connection.execute<RowDataPacket[]>(
        "SELECT id, total_points, t1 FROM general_ranking WHERE ranking_id = ? OR (ranking_id IS NULL AND ? = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1))",
        [rankingId, rankingId]
      );

      const sorted = sortRanking(
        allPlayers.map((p) => ({
          id: p.id,
          total_points: p.total_points,
          t1: p.t1 || 0,
        }))
      );

      // Aggiorna le posizioni
      for (let i = 0; i < sorted.length; i++) {
        await connection.execute(
          "UPDATE general_ranking SET position = ? WHERE id = ?",
          [i + 1, sorted[i].id]
        );
      }

      await connection.commit();
      connection.release();

      return NextResponse.json({
        success: true,
        message: `Stage "${stage.name}" merged successfully`,
        playersUpdated: stagePlayers.length,
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error merging stage:", error);
    return NextResponse.json(
      { error: "Failed to merge stage" },
      { status: 500 }
    );
  }
}
