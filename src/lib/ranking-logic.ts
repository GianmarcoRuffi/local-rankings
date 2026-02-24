export interface ParsedPlayer {
  position: number;
  name: string;
  score: number | null;
  t1: number;
  rawLine: string;
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
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const players: ParsedPlayer[] = [];

  const positionRegex =
    /^(\d+)[°\.\):\s]+([A-Za-zÀ-ÿ\s'-]+?)(?:\s+([\d.,]+))?\s*$/;

  for (const line of lines) {
    const match = line.match(positionRegex);
    if (match) {
      const position = parseInt(match[1], 10);
      const name = match[2].trim();
      const scoreStr = match[3]?.replace(",", ".");
      const score = scoreStr ? parseFloat(scoreStr) : null;

      if (position >= 1 && name.length > 0) {
        players.push({ position, name, score, t1: 0, rawLine: line });
      }
    }
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
  stagePlayers: Array<{ name: string; points_awarded: number; t1: number }>
): MergeResult {
  const generalMap = new Map(
    generalRanking.map((p) => [p.name.toLowerCase(), p])
  );
  const updatedPlayers: MergeResult["updatedPlayers"] = [];

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
 * - I valori negativi vengono prima dei positivi (in ordine decrescente)
 * - I valori positivi vengono ordinati per valore assoluto decrescente
 * - Lo zero va alla fine
 */
export function t1Comparator(a: number, b: number): number {
  const valA = Number(a) || 0;
  const valB = Number(b) || 0;

  // Se uno è zero e l'altro no, lo zero va dopo
  if (valA === 0 && valB !== 0) return 1;
  if (valB === 0 && valA !== 0) return -1;

  // Se entrambi zero, sono uguali
  if (valA === 0 && valB === 0) return 0;

  // Se a è negativo e b è positivo (o zero), a viene prima
  if (valA < 0 && valB >= 0) return -1;
  // Se a è positivo (o zero) e b è negativo, b viene prima
  if (valA >= 0 && valB < 0) return 1;

  // Se entrambi negativi, ordina per valore decrescente (più negativo prima)
  if (valA < 0 && valB < 0) {
    return valA - valB; // -11 viene prima di -2
  }

  // Se entrambi positivi, ordina per valore assoluto decrescente
  return Math.abs(valB) - Math.abs(valA);
}

/**
 * Ordina la classifica per punti totali (decrescente) e poi per T1 con comparatore personalizzato
 */
export function sortRanking<T extends { total_points: number; t1: number }>(
  players: T[]
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
export function recalculatePositions<T extends { total_points: number; t1: number }>(
  players: T[]
): Array<T & { position: number }> {
  const sorted = sortRanking(players);
  return sorted.map((player, index) => ({
    ...player,
    position: index + 1,
  }));
}

/**
 * Capitalizza la prima lettera del nome/cognome
 */
export function capitalizeName(name: string): string {
  if (!name || name.length === 0) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Formatta il valore T1 con segno positivo se necessario
 */
export function formatT1(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "0";
  if (value > 0) return `+${value}`;
  return String(value);
}

/**
 * Ordina i giocatori alfabeticamente per nome
 */
export function sortByName<T extends { name: string }>(players: T[]): T[] {
  return [...players].sort((a, b) => a.name.localeCompare(b.name, "it"));
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
  generalRanking: Array<{ name: string; total_points: number; t1: number; stages_played: number }>,
  playerName: string
): { name: string; total_points: number; t1: number; stages_played: number; isNew: boolean } {
  const normalizedName = normalizeName(playerName);
  const existing = generalRanking.find(
    (p) => normalizeName(p.name) === normalizedName
  );

  if (existing) {
    return { ...existing, isNew: false };
  }

  return {
    name: capitalizeName(playerName),
    total_points: 0,
    t1: 0,
    stages_played: 0,
    isNew: true,
  };
}

/**
 * Moltiplica il punteggio per 3 (per vittorie)
 */
export function multiplyScoreByThree(score: number): number {
  return score * 3;
}
