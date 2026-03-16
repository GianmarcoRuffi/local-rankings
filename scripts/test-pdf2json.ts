import PDFParser from 'pdf2json';
import { parsePdfText, capitalizeName } from '../src/lib/ranking-logic';

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

async function testPdf() {
  const pdfPath = './local 4 febbraio 2025.pdf';

  const pdfParser = new PDFParser();

  return new Promise<ReturnType<typeof parsePdfText>>((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', (errData: PdfErrorData) => {
      if (errData instanceof Error) {
        console.error('Error parsing PDF:', errData.message);
        reject(errData);
        return;
      }

      console.error('Error parsing PDF:', errData.parserError.message);
      reject(errData.parserError);
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: PdfData) => {
      // Estrai il testo
      let fullText = '';

      for (const page of pdfData.Pages) {
        const texts = page.Texts || [];
        texts.sort((a, b) => {
          // Ordina per Y poi X
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff > 0.5) return a.y - b.y;
          return a.x - b.x;
        });

        let lastY = -1;
        for (const text of texts) {
          const decoded = decodeURIComponent(text.R[0].T);

          if (lastY !== -1 && Math.abs(text.y - lastY) > 0.5) {
            fullText += '\n';
          }
          fullText += decoded + ' ';
          lastY = text.y;
        }
        fullText += '\n';
      }

      console.log('=== PRIME 50 RIGHE DEL PDF ===');
      const lines = fullText.split('\n').slice(0, 50);
      lines.forEach((line, i) => console.log(`${i}: "${line}"`));

      console.log('\n=== PARSING GIOCATORI ===');
      const players = parsePdfText(fullText);

      console.log(`\nTrovati ${players.length} giocatori:`);
      players.slice(0, 10).forEach((p) => {
        console.log(
          `${p.position}. ${capitalizeName(p.name)} - VP: ${p.score}, T1: ${p.t1}`,
        );
      });

      resolve(players);
    });

    pdfParser.loadPDF(pdfPath);
  });
}

testPdf().catch(console.error);
