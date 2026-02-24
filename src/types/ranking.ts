export interface GeneralRankingPlayer {
  id: number;
  position: number;
  name: string;
  total_points: number;
  t1: number;
  presenze: number;
  best_results: string | null;
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
  raw_data: string | null;
  created_at: string;
}

export interface Stage {
  id: number;
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
