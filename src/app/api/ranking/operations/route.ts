import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import { stageRanking, generalRanking } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { sortRanking, capitalizeName } from "@/lib/ranking-logic";
import { logger } from "@/lib/logger";

const operationSchema = z.object({
  operation: z.enum([
    "sortByName",
    "sortByPoints",
    "capitalizeNames",
    "recalculatePositions",
    "multiplyScores",
  ]),
  target: z.enum(["stage", "general"]).optional(),
});

/**
 * API per operazioni di gestione tabella
 *
 * Operazioni supportate:
 * - sortByName: Ordina alfabeticamente per nome
 * - sortByPoints: Ordina per punti totali (decrescente) e T1
 * - capitalizeNames: Capitalizza la prima lettera di ogni nome
 * - recalculatePositions: Ricalcola le posizioni in classifica
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = operationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid operation payload" },
        { status: 400 },
      );
    }

    const { operation, target } = parsed.data;

    const normalizedTarget = target ?? "general";

    const table = normalizedTarget === "stage" ? stageRanking : generalRanking;

    switch (operation) {
      case "sortByName": {
        const rows = await db.select().from(table);

        // Ordina alfabeticamente per nome
        const sorted = [...rows].sort((a, b) =>
          a.name.localeCompare(b.name, "it"),
        );

        await db.transaction(async (tx) => {
          for (let i = 0; i < sorted.length; i++) {
            await tx
              .update(table)
              .set({ position: i + 1 })
              .where(eq(table.id, sorted[i].id));
          }
        });

        return NextResponse.json({
          success: true,
          message: `Ordinamento alfabetico completato`,
          count: sorted.length,
        });
      }

      case "sortByPoints": {
        const rows = await db.select().from(table);

        const sorted = sortRanking(
          rows.map((row) => ({
            id: row.id,
            total_points: Number(
              ("totalPoints" in row ? row.totalPoints : row.pointsAwarded) ?? 0,
            ),
            t1: row.t1 ?? 0,
          })),
        );

        await db.transaction(async (tx) => {
          for (let i = 0; i < sorted.length; i++) {
            await tx
              .update(table)
              .set({ position: i + 1 })
              .where(eq(table.id, sorted[i].id));
          }
        });

        return NextResponse.json({
          success: true,
          message: `Ordinamento per punti completato`,
          count: sorted.length,
        });
      }

      case "capitalizeNames": {
        const rows = await db
          .select({ id: table.id, name: table.name })
          .from(table);

        let updated = 0;
        await db.transaction(async (tx) => {
          for (const row of rows) {
            const capitalizedName = capitalizeName(row.name as string);
            if (capitalizedName !== row.name) {
              await tx
                .update(table)
                .set({ name: capitalizedName })
                .where(eq(table.id, row.id));
              updated++;
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: `${updated} nomi capitalizzati`,
          updated,
        });
      }

      case "recalculatePositions": {
        const rows = await db.select().from(table);

        const sorted = sortRanking(
          rows.map((row) => ({
            id: row.id,
            total_points: Number(
              ("totalPoints" in row ? row.totalPoints : row.pointsAwarded) ?? 0,
            ),
            t1: row.t1 ?? 0,
          })),
        );

        await db.transaction(async (tx) => {
          for (let i = 0; i < sorted.length; i++) {
            await tx
              .update(table)
              .set({ position: i + 1 })
              .where(eq(table.id, sorted[i].id));
          }
        });

        return NextResponse.json({
          success: true,
          message: `Posizioni ricalcolate`,
          count: sorted.length,
        });
      }

      case "multiplyScores": {
        // Moltiplica i punteggi per 3 (per vittorie)
        if (normalizedTarget !== "stage") {
          return NextResponse.json(
            { error: "multiplyScores is only available for stage_ranking" },
            { status: 400 },
          );
        }

        await db
          .update(stageRanking)
          .set({ score: sql`${stageRanking.score} * 3` })
          .where(sql`${stageRanking.score} IS NOT NULL`);

        return NextResponse.json({
          success: true,
          message: `Punteggi moltiplicati per 3`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Operation failed", { error });
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
