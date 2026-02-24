import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { sortRanking, capitalizeName } from "@/lib/ranking-logic";

interface PlayerRow extends RowDataPacket {
  id: number;
  name: string;
  total_points: number;
  t1: number;
  position: number;
}

/**
 * API per operazioni di gestione tabella
 * 
 * Operazioni supportate:
 * - sortByName: Ordina alfabeticamente per nome
 * - sortByPoints: Ordina per punti totali (decrescente) e T1
 * - capitalizeNames: Capitalizza la prima lettera di ogni nome
 * - recalculatePositions: Ricalcola le posizioni in classifica
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { operation, target } = body;

    if (!operation) {
      return NextResponse.json(
        { error: "operation is required" },
        { status: 400 }
      );
    }

    const tableName = target === "stage" ? "stage_ranking" : "general_ranking";

    switch (operation) {
      case "sortByName": {
        const [rows] = await pool.execute<PlayerRow[]>(
          `SELECT * FROM ${tableName}`
        );
        
        // Ordina alfabeticamente per nome
        const sorted = [...rows].sort((a, b) => 
          a.name.localeCompare(b.name, "it")
        );

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          for (let i = 0; i < sorted.length; i++) {
            await connection.execute(
              `UPDATE ${tableName} SET position = ? WHERE id = ?`,
              [i + 1, sorted[i].id]
            );
          }
          await connection.commit();
          connection.release();

          return NextResponse.json({
            success: true,
            message: `Ordinamento alfabetico completato`,
            count: sorted.length,
          });
        } catch (error) {
          await connection.rollback();
          connection.release();
          throw error;
        }
      }

      case "sortByPoints": {
        const [rows] = await pool.execute<PlayerRow[]>(
          `SELECT * FROM ${tableName}`
        );

        const sorted = sortRanking(
          rows.map((row) => ({
            id: row.id,
            total_points: row.total_points ?? 0,
            t1: row.t1 ?? 0,
          }))
        );

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          for (let i = 0; i < sorted.length; i++) {
            await connection.execute(
              `UPDATE ${tableName} SET position = ? WHERE id = ?`,
              [i + 1, sorted[i].id]
            );
          }
          await connection.commit();
          connection.release();

          return NextResponse.json({
            success: true,
            message: `Ordinamento per punti completato`,
            count: sorted.length,
          });
        } catch (error) {
          await connection.rollback();
          connection.release();
          throw error;
        }
      }

      case "capitalizeNames": {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT id, name FROM ${tableName}`
        );

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          let updated = 0;
          for (const row of rows) {
            const capitalizedName = capitalizeName(row.name as string);
            if (capitalizedName !== row.name) {
              await connection.execute(
                `UPDATE ${tableName} SET name = ? WHERE id = ?`,
                [capitalizedName, row.id]
              );
              updated++;
            }
          }
          await connection.commit();
          connection.release();

          return NextResponse.json({
            success: true,
            message: `${updated} nomi capitalizzati`,
            updated,
          });
        } catch (error) {
          await connection.rollback();
          connection.release();
          throw error;
        }
      }

      case "recalculatePositions": {
        const [rows] = await pool.execute<PlayerRow[]>(
          `SELECT id, total_points, t1 FROM ${tableName}`
        );

        const sorted = sortRanking(
          rows.map((row) => ({
            id: row.id,
            total_points: row.total_points ?? 0,
            t1: row.t1 ?? 0,
          }))
        );

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          for (let i = 0; i < sorted.length; i++) {
            await connection.execute(
              `UPDATE ${tableName} SET position = ? WHERE id = ?`,
              [i + 1, sorted[i].id]
            );
          }
          await connection.commit();
          connection.release();

          return NextResponse.json({
            success: true,
            message: `Posizioni ricalcolate`,
            count: sorted.length,
          });
        } catch (error) {
          await connection.rollback();
          connection.release();
          throw error;
        }
      }

      case "multiplyScores": {
        // Moltiplica i punteggi per 3 (per vittorie)
        if (target !== "stage") {
          return NextResponse.json(
            { error: "multiplyScores is only available for stage_ranking" },
            { status: 400 }
          );
        }

        const [result] = await pool.execute<ResultSetHeader>(
          `UPDATE stage_ranking SET score = score * 3 WHERE score IS NOT NULL`
        );

        return NextResponse.json({
          success: true,
          message: `${result.affectedRows} punteggi moltiplicati per 3`,
          affectedRows: result.affectedRows,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in operations API:", error);
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}