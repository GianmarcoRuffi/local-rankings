"use client";

import { RankingProvider } from "@/hooks/useRanking";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <RankingProvider>{children}</RankingProvider>
    </TooltipProvider>
  );
}
