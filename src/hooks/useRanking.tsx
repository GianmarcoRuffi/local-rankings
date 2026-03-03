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

        // Set default ranking or first one
        if (data.length > 0 && !selectedRanking) {
          const defaultRanking = data.find((r) => r.is_default) || data[0];
          setSelectedRanking(defaultRanking);
        }
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedRanking]);

  useEffect(() => {
    fetchRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetSelectedRanking = useCallback((ranking: Ranking | null) => {
    setSelectedRanking(ranking);
    // Store in localStorage for persistence
    if (ranking) {
      localStorage.setItem("selectedRankingId", String(ranking.id));
    }
  }, []);

  // Check URL params and localStorage on mount
  useEffect(() => {
    if (rankings.length > 0 && !selectedRanking) {
      // Check URL param for ranking ID
      const params = new URLSearchParams(window.location.search);
      const rankingIdParam = params.get("rankingId");

      if (rankingIdParam) {
        const foundRanking = rankings.find(
          (r) => String(r.id) === rankingIdParam,
        );
        if (foundRanking) {
          setSelectedRanking(foundRanking);
          localStorage.setItem("selectedRankingId", String(foundRanking.id));
          return;
        }
      }

      // Restore from localStorage
      const storedId = localStorage.getItem("selectedRankingId");
      if (storedId) {
        const found = rankings.find((r) => String(r.id) === storedId);
        if (found) {
          setSelectedRanking(found);
          return;
        }
      }

      // Default fallback
      const defaultRanking = rankings.find((r) => r.is_default) || rankings[0];
      setSelectedRanking(defaultRanking);
    }
  }, [rankings, selectedRanking]);

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
