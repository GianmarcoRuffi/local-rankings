import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { rankings, stages, stageRanking, generalRanking } from "../src/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getPointsForPosition } from "../src/lib/ranking-logic";

async function main() {
  const { default: pool, db } = await import("../src/lib/db");
  try {
  await db.transaction(async tx => {
    await tx.execute(await import("drizzle-orm").then(({sql}) => sql`SELECT pg_advisory_xact_lock(946271)`));
    await tx.execute(sql`LOCK TABLE rankings, stages, stage_ranking, general_ranking IN SHARE ROW EXCLUSIVE MODE`);
    for (const table of ["rankings", "stages", "stage_ranking", "general_ranking"]) {
      await tx.execute(sql.raw("SELECT setval(pg_get_serial_sequence('" + table + "', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM " + table + "), 0), nextval(pg_get_serial_sequence('" + table + "', 'id'))), true)"));
    }
    for (const circuit of ["Aurora", "Tramonto"]) {
      const marker = "local-rankings-demo-v1:" + circuit;
      if ((await tx.select({id: rankings.id}).from(rankings).where(eq(rankings.description, marker))).length) {
        console.log(circuit + ": demo già presente, nessuna modifica");
        continue;
      }
      const [ranking] = await tx.insert(rankings).values({name: "DEMO — Circuito " + circuit, description: marker, isDefault: false}).returning();
      const totals = new Map<string, number>();
      for (let round = 1; round <= 3; round++) {
        const [stage] = await tx.insert(stages).values({rankingId: ranking.id, name: circuit + " — Tappa " + round, date: "2026-11-" + String(round * 4).padStart(2, "0"), status: round <= 2 ? "merged" : "active"}).returning();
        const players = Array.from({length: 8}, (_, i) => {
          const name = "Demo " + circuit + " Giocatore " + ((i + round) % 8 + 1);
          const points = getPointsForPosition(i + 1);
          if (round <= 2) totals.set(name, (totals.get(name) ?? 0) + points);
          return {stageId: stage.id, position: i + 1, name, score: String(8 - i), pointsAwarded: points, t1: 0, presenze: 1};
        });
        await tx.insert(stageRanking).values(players);
      }
      await tx.insert(generalRanking).values([...totals].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).map(([name,totalPoints],i) => ({rankingId: ranking.id, name, totalPoints, position:i+1,t1:0,presenze:2})));
      console.log(ranking.name + ": ID " + ranking.id + ", 3 tappe, 8 giocatori");
    }
  });
  } finally { await pool.end(); }
}
main().catch((error) => { console.error("Codice errore:", error?.cause?.code ?? error?.code ?? error?.name, error?.cause?.constraint ?? error?.constraint);console.error("Inserimento demo fallito; transazione annullata."); process.exitCode=1;});
