import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db } from "@/lib/db";
import {
  rankings,
  generalRanking,
  stages,
} from "@/lib/db/schema";
import { eq, not, isNull, desc, inArray, and, sql, or, gt } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
 const auth=await requireAuth(request);if(!auth.authorized)return auth.response;
 const params=request.nextUrl.searchParams;
 const limit=Number(params.get("limit") || 20);
 const keys=["rankings","generalRankingGroups","stages","generalRankingUngrouped"] as const;
 const pages=Object.fromEntries(keys.map(k=>[k,Number(params.get(k+"Page") || 1)]));
 if(!Number.isInteger(limit)||limit<1||limit>100||Object.values(pages).some(p=>!Number.isInteger(p)||p<1))return NextResponse.json({error:"Paginazione non valida"},{status:400});
 try {
  const offset=(k:string)=>(pages[k]-1)*limit;
  const deletedRankings=await db.select().from(rankings).where(not(isNull(rankings.deletedAt))).orderBy(desc(rankings.deletedAt),desc(rankings.id)).limit(limit).offset(offset("rankings"));
  const deletedStages=await db.select({id:stages.id,name:stages.name,deletedAt:stages.deletedAt,trashExpiresAt:stages.trashExpiresAt,rankingId:stages.rankingId,parentDeletedAt:rankings.deletedAt}).from(stages).leftJoin(rankings,eq(stages.rankingId,rankings.id)).where(not(isNull(stages.deletedAt))).orderBy(desc(stages.deletedAt),desc(stages.id)).limit(limit).offset(offset("stages"));
  const groups=await db.select({rankingId:generalRanking.rankingId,rankingName:rankings.name,parentDeletedAt:rankings.deletedAt,entryCount:sql<number>`count(*)::int`,totalPoints:sql<number>`sum(${generalRanking.totalPoints})::int`,deletedAt:sql<string>`max(${generalRanking.deletedAt})`,trashExpiresAt:sql<string>`min(${generalRanking.trashExpiresAt}) FILTER (WHERE ${generalRanking.trashExpiresAt} > NOW())`,restorableCount:sql<number>`count(*) FILTER (WHERE ${generalRanking.trashExpiresAt} IS NULL OR ${generalRanking.trashExpiresAt} > NOW())::int`}).from(generalRanking).leftJoin(rankings,eq(generalRanking.rankingId,rankings.id)).where(and(not(isNull(generalRanking.deletedAt)),not(isNull(generalRanking.rankingId)))).groupBy(generalRanking.rankingId,rankings.name,rankings.deletedAt).orderBy(desc(sql`max(${generalRanking.deletedAt})`),desc(generalRanking.rankingId)).limit(limit).offset(offset("generalRankingGroups"));
  const ungrouped=await db.select().from(generalRanking).where(and(not(isNull(generalRanking.deletedAt)),isNull(generalRanking.rankingId))).orderBy(desc(generalRanking.deletedAt),desc(generalRanking.id)).limit(limit).offset(offset("generalRankingUngrouped"));
  const totals=await db.execute(sql`SELECT (SELECT count(*)::int FROM rankings WHERE deleted_at IS NOT NULL) AS rankings,(SELECT count(DISTINCT ranking_id)::int FROM general_ranking WHERE deleted_at IS NOT NULL) AS "generalRankingGroups",(SELECT count(*)::int FROM stages WHERE deleted_at IS NOT NULL) AS stages,(SELECT count(*)::int FROM general_ranking WHERE deleted_at IS NOT NULL AND ranking_id IS NULL) AS "generalRankingUngrouped"`);
  const pagination=Object.fromEntries(keys.map(k=>[k,{page:pages[k],limit,total:Number(totals.rows[0][k]),totalPages:Math.ceil(Number(totals.rows[0][k])/limit)}]));
  return NextResponse.json({rankings:deletedRankings,generalRankingGroups:groups,generalRankingUngrouped:ungrouped,stages:deletedStages,pagination});
 }catch(error){logger.error("Trash read failed",{error});return NextResponse.json({error:"Lettura del cestino non riuscita"},{status:500});}
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.response;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({error:"JSON non valido",code:"INVALID_PAYLOAD"},{status:400}); }
  const schema = z.union([
    ...["restoreRanking", "deletePermanentlyRanking", "restoreGeneralRanking", "deletePermanentlyGeneralRanking"].map(action => z.object({action:z.literal(action),rankingId:z.number().int().positive()})),
    ...["restoreStage", "deletePermanentlyStage"].map(action => z.object({action:z.literal(action),stageId:z.number().int().positive()})),
    ...["restoreGeneralEntry", "deletePermanentlyGeneralEntry"].map(action => z.object({action:z.literal(action),entryId:z.number().int().positive()})),
  ]);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error:"Richiesta non valida",code:"INVALID_PAYLOAD"},{status:400});
  const action = body.action as string;
  const restoring = action.startsWith("restore");
  const group = action.endsWith("GeneralRanking");
  const table = action.endsWith("Ranking") && !group ? rankings : action.endsWith("Stage") ? stages : generalRanking;
  const id = body.rankingId ?? body.stageId ?? body.entryId;
  try {
    return await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(817241)`);
      const targets = group
        ? await tx.select().from(generalRanking).where(and(eq(generalRanking.rankingId,id),not(isNull(generalRanking.deletedAt))))
        : await tx.select().from(table).where(eq(table.id,id));
      const fail = (error:string,code:string,status:number) => NextResponse.json({error,code},{status});
      if (!targets.length) return fail("Elemento non trovato nel cestino","NOT_FOUND",404);
      if (targets.some(t=>!t.deletedAt)) return fail("L'elemento non è nel cestino","NOT_TRASHED",409);
      const parentId = table === rankings ? id : group ? id : (targets[0] as typeof stages.$inferSelect).rankingId;
      const [parent] = parentId ? await tx.select().from(rankings).where(eq(rankings.id,parentId)) : [];
      if (restoring && table !== rankings && parent?.deletedAt) return NextResponse.json({error:"Ripristina prima il circuito",code:"PARENT_TRASHED",rankingId:parentId},{status:409});
      const now = new Date();
      const eligible = targets.filter(t=>!t.trashExpiresAt || t.trashExpiresAt > now);
      if (restoring && !eligible.length) return fail("Il termine per il ripristino è scaduto","EXPIRED",409);
      if (table === rankings && !restoring) {
        const [activeStage] = await tx.select({id:stages.id}).from(stages).where(and(eq(stages.rankingId,id),isNull(stages.deletedAt))).limit(1);
        const [activeEntry] = await tx.select({id:generalRanking.id}).from(generalRanking).where(and(eq(generalRanking.rankingId,id),isNull(generalRanking.deletedAt))).limit(1);
        if(activeStage || activeEntry) return fail("Il circuito contiene dati attivi: risolvere l'incoerenza prima di eliminarlo","ACTIVE_CHILDREN",409);
      }
      if (!restoring) {
        await tx.delete(table).where(inArray(table.id,targets.map(t=>t.id)));
        return NextResponse.json({success:true,message:"Eliminato definitivamente"});
      }
      const clear = {deletedAt:null,deletionGroup:null,trashExpiresAt:null};
      await tx.update(table).set(clear).where(inArray(table.id,eligible.map(t=>t.id)));
      let restoredEntries=0, restoredStages=0;
      if(table === rankings && targets[0].deletionGroup) {
        const deletionGroup=targets[0].deletionGroup;
        restoredEntries=(await tx.update(generalRanking).set(clear).where(and(eq(generalRanking.rankingId,id),eq(generalRanking.deletionGroup,deletionGroup),not(isNull(generalRanking.deletedAt)),or(isNull(generalRanking.trashExpiresAt),gt(generalRanking.trashExpiresAt,now)))).returning({id:generalRanking.id})).length;
        restoredStages=(await tx.update(stages).set(clear).where(and(eq(stages.rankingId,id),eq(stages.deletionGroup,deletionGroup),not(isNull(stages.deletedAt)),or(isNull(stages.trashExpiresAt),gt(stages.trashExpiresAt,now)))).returning({id:stages.id})).length;
      }
      return NextResponse.json({success:true,message:"Ripristinato",restoredEntries,restoredStages,restoredCount:eligible.length});
    });
  } catch(error) {
    logger.error("Trash operation failed",{error});
    return NextResponse.json({error:"Operazione non riuscita",code:"INTERNAL_ERROR"},{status:500});
  }
}
