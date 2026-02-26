export interface Ranking {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface StageRankingPlayer {
  id: number;
  stage_id: number;
  position: number;
  name: string;
  score: number | null;
  points_awarded: number;
  t1: number;
  presenze: number;
  created_at: string;
}

export interface Stage {
  id: number;
  ranking_id: number | null;
  name: string;
  date: string | null;
  pdf_filename: string | null;
  status: "pending" | "active" | "merged";
  created_at: string;
  updated_at: string;
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}
