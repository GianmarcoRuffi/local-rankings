export interface ParsedPlayer {
  position: number;
  name: string;
  score: number | null;
  t1: number;
  rawLine: string;
}

export interface ParsedTablePlayer {
  position: number;
  name: string;
  score: number | null;
  t1: number;
}

const POINTS_TABLE: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

export function getPointsForPosition(position: number): number {
  return POINTS_TABLE[position] ?? 0;
}

export function parsePdfText(text: string): ParsedPlayer[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const players: ParsedPlayer[] = [];

  // Pattern per estrarre: posizione nome VP T1 T2 T3
  // Esempio: "1 materazzo, ivan 4 +6 +5 0"
  const dataRegex =
    /^(\d+)\s+(.+?)\s+(\d+)\s+([\+\-]?\d+)\s+([\+\-]?\d+)\s+([\+\-]?\d+)\s*$/;

  // Skip headers e altre info non rilevanti
  const skipPatterns = [
    /^Classifiche/i,
    /^Turno/i,
    /^Giocatore/i,
    /^pagina/i,
    /^VP\s+T1\s+T2/i,
  ];

  for (const line of lines) {
    // Salta le righe header
    if (skipPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    const match = line.match(dataRegex);
    if (match) {
      const position = parseInt(match[1], 10);
      const name = match[2].trim();
      const vp = parseInt(match[3], 10);
      const t1Str = match[4];
      const t1 = parseInt(t1Str.replace('+', ''), 10);

      if (position >= 1 && name.length > 0 && !isNaN(vp)) {
        players.push({
          position,
          name,
          score: vp,
          t1: isNaN(t1) ? 0 : t1,
          rawLine: line,
        });
      }
    }
  }

  return players.sort((a, b) => a.position - b.position);
}

export function parsePdfTableData(tableRows: string[][]): ParsedTablePlayer[] {
  const players: ParsedTablePlayer[] = [];

  for (const row of tableRows) {
    if (row.length < 4) continue;

    const [col0, col1, col2, col3] = row.map((c) => (c ?? '').trim());

    const position = parseInt(col0, 10);
    if (isNaN(position) || position < 1) continue;

    const name = col1;
    if (!name || name.length === 0) continue;

    const scoreStr = col2.replace(',', '.');
    const score =
      scoreStr !== '' && !isNaN(parseFloat(scoreStr))
        ? parseFloat(scoreStr)
        : null;

    const t1Str = col3.replace(/\s/g, '');
    const t1 = t1Str !== '' ? parseInt(t1Str, 10) : 0;

    players.push({ position, name, score, t1: isNaN(t1) ? 0 : t1 });
  }

  return players.sort((a, b) => a.position - b.position);
}

export interface MergeResult {
  updatedPlayers: Array<{
    name: string;
    previousPoints: number;
    addedPoints: number;
    newTotal: number;
    previousT1: number;
    addedT1: number;
    newT1: number;
    isNew: boolean;
  }>;
}

export function calculateMerge(
  generalRanking: Array<{ name: string; total_points: number; t1: number }>,
  stagePlayers: Array<{ name: string; points_awarded: number; t1: number }>,
): MergeResult {
  const generalMap = new Map(
    generalRanking.map((p) => [p.name.toLowerCase(), p]),
  );
  const updatedPlayers: MergeResult['updatedPlayers'] = [];

  for (const stagePlayer of stagePlayers) {
    const key = stagePlayer.name.toLowerCase();
    const existing = generalMap.get(key);
    const previousPoints = existing?.total_points ?? 0;
    const addedPoints = stagePlayer.points_awarded;
    const previousT1 = existing?.t1 ?? 0;
    const addedT1 = stagePlayer.t1;

    updatedPlayers.push({
      name: stagePlayer.name,
      previousPoints,
      addedPoints,
      newTotal: previousPoints + addedPoints,
      previousT1,
      addedT1,
      newT1: previousT1 + addedT1,
      isNew: !existing,
    });
  }

  return { updatedPlayers };
}

/**
 * Comparatore personalizzato per ordinare i valori T1
 * Logica:
 * - I valori positivi vengono prima (ordinati per valore assoluto decrescente)
 * - Lo zero va nel mezzo
 * - I valori negativi vengono dopo (ordinati per valore crescente: -2 prima di -11)
 *
 * Esempio di ordinamento: +14, +8, +5, +4, 0, -2, -11
 */
export function t1Comparator(a: number, b: number): number {
  const valA = Number(a) || 0;
  const valB = Number(b) || 0;

  // Se uno è zero e l'altro no, lo zero va dopo i positivi ma prima dei negativi
  if (valA === 0 && valB !== 0) {
    return valB > 0 ? 1 : -1; // 0 viene dopo i positivi, prima dei negativi
  }
  if (valB === 0 && valA !== 0) {
    return valA > 0 ? -1 : 1; // 0 viene dopo i positivi, prima dei negativi
  }

  // Se entrambi zero, sono uguali
  if (valA === 0 && valB === 0) return 0;

  // Se a è positivo e b è negativo, a viene prima
  if (valA > 0 && valB < 0) return -1;
  // Se a è negativo e b è positivo, b viene prima
  if (valA < 0 && valB > 0) return 1;

  // Se entrambi negativi, ordina per valore crescente (meno negativo prima)
  // Esempio: -2 viene prima di -11 (più alto = meno negativo)
  if (valA < 0 && valB < 0) {
    return valB - valA; // -2 viene prima di -11
  }

  // Se entrambi positivi, ordina per valore assoluto decrescente
  return Math.abs(valB) - Math.abs(valA);
}

/**
 * Ordina la classifica per punti totali (decrescente) e poi per T1 con comparatore personalizzato
 */
export function sortRanking<T extends { total_points: number; t1: number }>(
  players: T[],
): T[] {
  return [...players].sort((a, b) => {
    // Prima ordina per punti totali decrescenti
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }
    // A parità di punti, usa il comparatore T1
    return t1Comparator(a.t1, b.t1);
  });
}

/**
 * Rinumera le posizioni della classifica
 */
export function recalculatePositions<
  T extends { total_points: number; t1: number },
>(players: T[]): Array<T & { position: number }> {
  const sorted = sortRanking(players);
  return sorted.map((player, index) => ({
    ...player,
    position: index + 1,
  }));
}

/**
 * Capitalizza la prima lettera del nome/cognome
 * Gestisce il formato "cognome, nome" e nomi composti
 */
export function capitalizeName(name: string): string {
  if (!name || name.length === 0) return name;

  // Split su virgola se presente (formato "cognome, nome")
  const parts = name.split(',').map((part) => part.trim());

  // Capitalizza ogni parte
  const capitalizedParts = parts.map((part) => {
    // Split su spazi per gestire nomi composti
    return part
      .split(/\s+/)
      .map((word) => {
        if (word.length === 0) return word;
        // Preserva parentesi e altri caratteri speciali
        if (word.includes('(')) {
          return word
            .split('(')
            .map((w) => {
              if (w.length === 0) return w;
              return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            })
            .join('(');
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  });

  return capitalizedParts.join(', ');
}

/**
 * Formatta il valore T1 con segno positivo se necessario
 */
export function formatT1(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '0';
  if (value > 0) return `+${value}`;
  return String(value);
}

/**
 * Ordina i giocatori alfabeticamente per nome
 */
export function sortByName<T extends { name: string }>(players: T[]): T[] {
  return [...players].sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

/**
 * Normalizza il nome per il matching (case insensitive, trim)
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Trova o crea un giocatore nel ranking generale basandosi sul nome normalizzato
 */
export function findOrCreatePlayer(
  generalRanking: Array<{
    name: string;
    total_points: number;
    t1: number;
    presenze: number;
  }>,
  playerName: string,
): {
  name: string;
  total_points: number;
  t1: number;
  presenze: number;
  isNew: boolean;
} {
  const normalizedName = normalizeName(playerName);
  const existing = generalRanking.find(
    (p) => normalizeName(p.name) === normalizedName,
  );

  if (existing) {
    return { ...existing, isNew: false };
  }

  return {
    name: capitalizeName(playerName),
    total_points: 0,
    t1: 0,
    presenze: 0,
    isNew: true,
  };
}

/**
 * Moltiplica il punteggio per 3 (per vittorie)
 */
export function multiplyScoreByThree(score: number): number {
  return score * 3;
}
