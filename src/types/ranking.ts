export interface Ranking {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GeneralRankingPlayer {
  id: number;
  ranking_id: number | null;
  position: number;
  name: string;
  total_points: number;
  t1: number;
  presenze: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StageRankingPlayer {
  id: number;
  stageId: number;
  position: number;
  name: string;
  score: number | null;
  pointsAwarded: number;
  t1: number;
  presenze: number;
  createdAt: string;
}

export interface Stage {
  id: number;
  rankingId: number | null;
  name: string;
  date: string | null;
  pdfFilename: string | null;
  status: "pending" | "active" | "merged";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}
