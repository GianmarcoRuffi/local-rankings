import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { stages, rankings, stageRanking } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parsePdfText, capitalizeName } from '@/lib/ranking-logic';
import PDFParser from 'pdf2json';

type PdfErrorData = Error | { parserError: Error };

interface PdfTextToken {
  x: number;
  y: number;
  R: Array<{ T: string }>;
}

interface PdfPage {
  Texts?: PdfTextToken[];
}

interface PdfData {
  Pages: PdfPage[];
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

function toPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[PDF Upload] Starting upload...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const stageName = formData.get('stageName') as string | null;
    const stageDate = formData.get('stageDate') as string | null;
    const rankingIdStr = formData.get('rankingId') as string | null;
    const rankingId = rankingIdStr ? toPositiveInt(rankingIdStr) : null;

    if (rankingIdStr && !rankingId) {
      return NextResponse.json({ error: 'Invalid rankingId' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    console.log('[PDF Upload] File received:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF per estrarre il testo
    console.log('[PDF Upload] Parsing PDF...');
    const fullText = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: PdfErrorData) => {
        if (errData instanceof Error) {
          reject(errData);
          return;
        }

        reject(errData.parserError);
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: PdfData) => {
        let text = '';

        for (const page of pdfData.Pages) {
          const texts = page.Texts || [];
          texts.sort((a, b) => {
            // Ordina per Y poi X
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff > 0.5) return a.y - b.y;
            return a.x - b.x;
          });

          let lastY = -1;
          for (const textItem of texts) {
            const decoded = decodeURIComponent(textItem.R[0].T);

            if (lastY !== -1 && Math.abs(textItem.y - lastY) > 0.5) {
              text += '\n';
            }
            text += decoded + ' ';
            lastY = textItem.y;
          }
          text += '\n';
        }

        resolve(text);
      });

      pdfParser.parseBuffer(buffer);
    });

    console.log('[PDF Upload] PDF parsed, text length:', fullText.length);

    // Parse il testo per estrarre i giocatori
    console.log('[PDF Upload] Extracting players...');
    const players = parsePdfText(fullText);
    console.log('[PDF Upload] Players extracted:', players.length);

    if (players.length === 0) {
      return NextResponse.json(
        { error: 'Nessun giocatore trovato nel PDF. Verifica il formato.' },
        { status: 422 },
      );
    }

    // Get the ranking_id to use
    let effectiveRankingId = rankingId;
    if (!effectiveRankingId) {
      const defaultRanking = await db
        .select({ id: rankings.id })
        .from(rankings)
        .where(eq(rankings.isDefault, true))
        .limit(1);
      if (defaultRanking.length > 0) {
        effectiveRankingId = defaultRanking[0].id;
      }
    }

    const name = (stageName?.trim() || file.name.replace('.pdf', '')).trim();
    if (!name) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
    }

    console.log('[PDF Upload] Creating stage:', name, 'for ranking:', effectiveRankingId);
    
    const result = await db.transaction(async (tx) => {
      const [insertedStage] = await tx
        .insert(stages)
        .values({
          name,
          date: stageDate ? new Date(stageDate).toISOString().split('T')[0] : null,
          pdfFilename: file.name,
          rankingId: effectiveRankingId,
          status: 'active',
        })
        .returning();

      const stageId = insertedStage.id;
      console.log('[PDF Upload] Stage created with ID:', stageId);

      console.log('[PDF Upload] Inserting players...');
      const playersToInsert = players.map((player) => ({
        stageId,
        position: player.position,
        name: capitalizeName(player.name),
        score: player.score?.toString() ?? null,
        pointsAwarded: (player.score ?? 0) * 3,
        t1: player.t1 ?? 0,
        presenze: 1,
      }));

      await tx.insert(stageRanking).values(playersToInsert);
      
      return { stageId };
    });

    console.log('[PDF Upload] All players inserted successfully');

    return NextResponse.json({
      stageId: result.stageId,
      stageName: name,
      rankingId: effectiveRankingId,
      playersCount: players.length,
      players: players.map((p) => ({
        ...p,
        name: capitalizeName(p.name),
        points: (p.score ?? 0) * 3,
      })),
    });
  } catch (error) {
    console.error('[PDF Upload] Error processing PDF:', error);
    console.error(
      '[PDF Upload] Error stack:',
      error instanceof Error ? error.stack : 'No stack',
    );
    return NextResponse.json(
      {
        error: "Errore durante l'elaborazione del PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
