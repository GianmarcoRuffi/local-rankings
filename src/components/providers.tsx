"use client";

import { SessionProvider } from "@/hooks/useSession";
import { RankingProvider } from "@/hooks/useRanking";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SessionProvider><RankingProvider>{children}</RankingProvider></SessionProvider>
    </TooltipProvider>
  );
}
