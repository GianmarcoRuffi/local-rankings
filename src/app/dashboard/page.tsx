import { GeneralRankingTable } from "@/components/general-ranking-table";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Classifica Generale</h1>
        <p className="text-muted-foreground mt-1">
          Classifica cumulativa di tutti i giocatori del torneo
        </p>
      </div>
      <GeneralRankingTable />
    </div>
  );
}
