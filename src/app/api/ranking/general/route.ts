import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { sortRanking } from "@/lib/ranking-logic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rankingId = searchParams.get("rankingId");

    let query = "SELECT * FROM general_ranking";
    const params: (string | number)[] = [];

    if (rankingId) {
      // Include entries for this specific ranking
      query += " WHERE ranking_id = ? OR (ranking_id IS NULL AND ? = (SELECT id FROM rankings WHERE is_default = 1 LIMIT 1))";
      params.push(rankingId, rankingId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Ordina usando il comparatore personalizzato
    const sorted = sortRanking(
      rows.map((row) => ({
        ...row,
        total_points: row.total_points ?? 0,
        t1: row.t1 ?? 0,
      }))
    );

    // Aggiungi la posizione
    const ranked = sorted.map((row, index) => ({
      ...row,
      position: index + 1,
    }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Error fetching general ranking:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}
