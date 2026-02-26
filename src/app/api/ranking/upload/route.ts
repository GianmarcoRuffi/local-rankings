import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { parsePdfText, capitalizeName } from '@/lib/ranking-logic';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import PDFParser from 'pdf2json';

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
    const rankingId = rankingIdStr ? parseInt(rankingIdStr, 10) : null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[PDF Upload] File received:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF per estrarre il testo
    console.log('[PDF Upload] Parsing PDF...');
    const fullText = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(errData.parserError));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        let text = '';

        for (const page of pdfData.Pages) {
          const texts = page.Texts || [];
          texts.sort((a: any, b: any) => {
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
      const [defaultRanking] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM rankings WHERE is_default = 1 LIMIT 1"
      );
      if (defaultRanking.length > 0) {
        effectiveRankingId = defaultRanking[0].id;
      }
    }

    const name = stageName || file.name.replace('.pdf', '');
    console.log('[PDF Upload] Creating stage:', name, 'for ranking:', effectiveRankingId);
    const [stageResult] = await pool.execute<ResultSetHeader>(
      "INSERT INTO stages (name, date, pdf_filename, ranking_id, status) VALUES (?, ?, ?, ?, 'active')",
      [name, stageDate || null, file.name, effectiveRankingId],
    );
    const stageId = stageResult.insertId;
    console.log('[PDF Upload] Stage created with ID:', stageId);

    console.log('[PDF Upload] Inserting players...');
    for (const player of players) {
      // Calcola i punti come VP * 3
      const points = (player.score ?? 0) * 3;
      const capitalizedName = capitalizeName(player.name);
      console.log(
        `[PDF Upload] Inserting player ${player.position}: ${capitalizedName}, VP: ${player.score}, Points: ${points}, T1: ${player.t1}`,
      );
      await pool.execute(
        'INSERT INTO stage_ranking (stage_id, position, name, score, points_awarded, t1, presenze) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [
          stageId,
          player.position,
          capitalizedName,
          player.score,
          points,
          player.t1 ?? 0,
        ],
      );
    }
    console.log('[PDF Upload] All players inserted successfully');

    return NextResponse.json({
      stageId,
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
