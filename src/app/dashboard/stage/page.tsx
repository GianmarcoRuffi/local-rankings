import { StageRankingView } from "@/components/stage-ranking-view";

export default function StagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Classifica Tappa</h1>
        <p className="text-muted-foreground mt-1">
          Visualizza e gestisci le classifiche delle singole tappe
        </p>
      </div>
      <StageRankingView />
    </div>
  );
}
