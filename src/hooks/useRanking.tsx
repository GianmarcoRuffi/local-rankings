"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Ranking } from "@/types/ranking";

interface RankingContextType {
  rankings: Ranking[];
  selectedRanking: Ranking | null;
  setSelectedRanking: (ranking: Ranking | null) => void;
  loading: boolean;
  refreshRankings: () => Promise<void>;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export function RankingProvider({ children }: { children: ReactNode }) {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [selectedRanking, setSelectedRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rankings");
      if (res.ok) {
        const data: Ranking[] = await res.json();
        setRankings(data);

        if (data.length > 0) {
          // 1. Controlla URL params
          const params = new URLSearchParams(window.location.search);
          const rankingIdParam = params.get("rankingId");
          if (rankingIdParam) {
            const found = data.find((r) => String(r.id) === rankingIdParam);
            if (found) {
              setSelectedRanking(found);
              localStorage.setItem("selectedRankingId", String(found.id));
              setLoading(false);
              return;
            }
          }

          // 2. Controlla localStorage
          const storedId = localStorage.getItem("selectedRankingId");
          if (storedId) {
            const found = data.find((r) => String(r.id) === storedId);
            if (found) {
              setSelectedRanking(found);
              setLoading(false);
              return;
            }
          }

          // 3. Fallback al default
          const defaultRanking = data.find((r) => r.is_default) || data[0];
          setSelectedRanking(defaultRanking);
        }
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const handleSetSelectedRanking = useCallback((ranking: Ranking | null) => {
    setSelectedRanking(ranking);
    if (ranking) {
      localStorage.setItem("selectedRankingId", String(ranking.id));
    }
  }, []);

  return (
    <RankingContext.Provider
      value={{
        rankings,
        selectedRanking,
        setSelectedRanking: handleSetSelectedRanking,
        loading,
        refreshRankings: fetchRankings,
      }}
    >
      {children}
    </RankingContext.Provider>
  );
}

export function useRanking() {
  const context = useContext(RankingContext);
  if (context === undefined) {
    throw new Error("useRanking must be used within a RankingProvider");
  }
  return context;
}
