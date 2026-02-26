import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rankingId = searchParams.get("rankingId");

    let query = "SELECT * FROM stages";
    const params: (string | number)[] = [];

    if (rankingId) {
      query += " WHERE ranking_id = ? OR (ranking_id IS NULL AND ? = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1))";
      params.push(rankingId, rankingId);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, date, players, rankingId } = body;

    // Get the default ranking if no rankingId provided
    let effectiveRankingId = rankingId;
    if (!effectiveRankingId) {
      const [defaultRanking] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM rankings WHERE is_default = 1 LIMIT 1"
      );
      if (defaultRanking.length > 0) {
        effectiveRankingId = defaultRanking[0].id;
      }
    }

    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO stages (name, date, ranking_id, status) VALUES (?, ?, ?, 'active')",
      [name, date || null, effectiveRankingId]
    );

    const stageId = result.insertId;

    // If players are provided, insert them
    if (players && Array.isArray(players) && players.length > 0) {
      for (const player of players) {
        await pool.execute(
          "INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            stageId,
            player.position,
            player.name,
            player.score ?? null,
            player.points_awarded,
            player.t1 ?? 0,
            player.presenze ?? 1,
          ]
        );
      }
    }

    return NextResponse.json({
      id: stageId,
      name,
      date,
      ranking_id: effectiveRankingId,
      playersCount: players?.length ?? 0,
    });
  } catch (error) {
    console.error("Error creating stage:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 }
    );
  }
}
