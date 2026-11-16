import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(process.env.VERCEL_ENV !== "production" || process.env.TRASH_CLEANUP_ENABLED !== "true") return NextResponse.json({disabled:true});
  const dryRun=request.nextUrl.searchParams.get("dryRun") === "true";
  try {
    const result=await db.transaction(async tx=>{
      await tx.execute(sql`SELECT pg_advisory_xact_lock(817241)`);
      const counts:Record<string,number>={};
      const deadline=Date.now()+20000;
      // Child records are removed first; foreign keys preserve atomic cascades.
      for(const table of ["stages","general_ranking","rankings"]){
        const safeParent = table === "rankings" ? sql`AND NOT EXISTS(SELECT 1 FROM stages s WHERE s.ranking_id=rankings.id AND (s.deleted_at IS NULL OR s.trash_expires_at IS NULL OR s.trash_expires_at > NOW())) AND NOT EXISTS(SELECT 1 FROM general_ranking g WHERE g.ranking_id=rankings.id AND (g.deleted_at IS NULL OR g.trash_expires_at IS NULL OR g.trash_expires_at > NOW()))` : sql``;
        counts[table]=0;
        while(Date.now()<deadline) {
        const candidates=await tx.execute(sql`SELECT id FROM ${sql.identifier(table)} WHERE deleted_at IS NOT NULL AND trash_expires_at <= NOW() ${safeParent} ORDER BY id LIMIT 100 FOR UPDATE`);
        counts[table]+=candidates.rows.length;
        if(!dryRun && candidates.rows.length) await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE id IN (${sql.join(candidates.rows.map(r=>sql`${r.id}`),sql`,`)})`);
        if(dryRun || candidates.rows.length<100) break;
        }
      }
      return counts;
    });
    console.info("trash-cleanup",{dryRun,counts:result});
    return NextResponse.json({dryRun,counts:result});
  } catch { console.error("trash-cleanup failed");return NextResponse.json({error:"Pulizia non riuscita"},{status:500}); }
}
