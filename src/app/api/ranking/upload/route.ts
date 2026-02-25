import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { parsePdfTableData, getPointsForPosition, capitalizeName } from "@/lib/ranking-logic";
import { ResultSetHeader } from "mysql2";
import { PDFParse } from "pdf-parse";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const stageName = formData.get("stageName") as string | null;
    const stageDate = formData.get("stageDate") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    const tableResult = await parser.getTable();
    await parser.destroy();

    const allRows: string[][] = [];
    for (const page of tableResult.pages) {
      for (const table of page.tables) {
        for (const row of table) {
          allRows.push(row as string[]);
        }
      }
    }

    const players = parsePdfTableData(allRows);

    if (players.length === 0) {
      return NextResponse.json(
        { error: "Nessun giocatore trovato nel PDF. Verifica il formato." },
        { status: 422 }
      );
    }

    const name = stageName || file.name.replace(".pdf", "");
    const [stageResult] = await pool.execute<ResultSetHeader>(
      "INSERT INTO stages (name, date, pdf_filename, status) VALUES (?, ?, ?, 'active')",
      [name, stageDate || null, file.name]
    );
    const stageId = stageResult.insertId;

    for (const player of players) {
      const points = getPointsForPosition(player.position);
      const capitalizedName = capitalizeName(player.name);
      await pool.execute(
        "INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES (?, ?, ?, ?, ?, ?, 1)",
        [
          stageId,
          player.position,
          capitalizedName,
          player.score,
          points,
          player.t1 ?? 0,
        ]
      );
    }

    return NextResponse.json({
      stageId,
      stageName: name,
      playersCount: players.length,
      players: players.map((p) => ({
        ...p,
        name: capitalizeName(p.name),
        points: getPointsForPosition(p.position),
      })),
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Errore durante l'elaborazione del PDF" },
      { status: 500 }
    );
  }
}
