"use client";

import { SessionProvider } from "next-auth/react";
import { RankingProvider } from "@/hooks/useRanking";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <RankingProvider>
          {children}
        </RankingProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
