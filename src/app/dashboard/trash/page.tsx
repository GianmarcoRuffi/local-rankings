"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Trophy,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface TrashItem {
  id: number;
  name: string;
  deletedAt: string;
  type: "ranking" | "generalEntry" | "stage";
  rankingId?: number | null;
  totalPoints?: number;
  name2?: string;
}

export default function TrashPage() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [rankings, setRankings] = useState<TrashItem[]>([]);
  const [generalEntries, setGeneralEntries] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ranking/trash");
      if (res.ok) {
        const data = await res.json();
        
        // Transform rankings
        const transformedRankings: TrashItem[] = data.rankings.map(
          (r: { id: number; name: string; deletedAt: Date }) => ({
            id: r.id,
            name: r.name,
            deletedAt: r.deletedAt,
            type: "ranking",
          })
        );
        setRankings(transformedRankings);

        // Transform general ranking entries
        const transformedGeneral: TrashItem[] = data.generalRanking.map(
          (e: { id: number; rankingId: number | null; name: string; totalPoints: number; deletedAt: Date }) => ({
            id: e.id,
            name: e.name,
            name2: e.name,
            totalPoints: e.totalPoints,
            rankingId: e.rankingId,
            deletedAt: e.deletedAt,
            type: "generalEntry",
          })
        );
        setGeneralEntries(transformedGeneral);
      }
    } catch (error) {
      console.error("Error fetching trash:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTrash();
    }
  }, [isAuthenticated, fetchTrash]);

  const handleRestore = async (item: TrashItem) => {
    setRestoring(item.id);
    try {
      let res;
      if (item.type === "ranking") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restoreRanking",
            rankingId: item.id,
          }),
        });
      } else if (item.type === "generalEntry") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restoreGeneralEntry",
            entryId: item.id,
          }),
        });
      }

      if (res?.ok) {
        toast({
          title: "Ripristinato",
          description: `${item.name} è stato ripristinato.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        await fetchTrash();
      } else {
        const data = await res?.json();
        toast({
          title: "Errore",
          description: data?.error || "Errore durante il ripristino",
          variant: "destructive",
        });
      }
    } finally {
      setRestoring(null);
    }
  };

  const handleDeletePermanently = async (item: TrashItem) => {
    setDeleting(item.id);
    try {
      let res;
      if (item.type === "ranking") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deletePermanentlyRanking",
            rankingId: item.id,
          }),
        });
      } else if (item.type === "generalEntry") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deletePermanentlyGeneralEntry",
            entryId: item.id,
          }),
        });
      }

      if (res?.ok) {
        toast({
          title: "Eliminato",
          description: `${item.name} è stato eliminato definitivamente.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        await fetchTrash();
      } else {
        const data = await res?.json();
        toast({
          title: "Errore",
          description: data?.error || "Errore durante l'eliminazione definitiva",
          variant: "destructive",
        });
      }
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accesso negato</h1>
        <p className="text-muted-foreground">
          Devi effettuare l&apos;accesso per visualizzare il cestino.
        </p>
      </div>
    );
  }

  const hasItems = rankings.length > 0 || generalEntries.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trash2 className="h-8 w-8" />
          Cestino
        </h1>
        <p className="text-muted-foreground mt-1">
          Classifiche e dati eliminati. Puoi ripristinarli o eliminarli definitivamente.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Caricamento...
          </div>
        </div>
      ) : !hasItems ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trash2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Il cestino è vuoto</h3>
            <p className="text-muted-foreground max-w-md">
              Le classifiche e i dati eliminati appariranno qui. Vengono conservati per 5 giorni
              prima dell&apos;eliminazione definitiva.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Rankings in Trash */}
          {rankings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Circuiti / Classifiche
                  <Badge variant="secondary" className="ml-2">
                    {rankings.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rankings.map((item) => (
                    <div
                      key={`ranking-${item.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Eliminato il {formatDate(item.deletedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(item)}
                          disabled={restoring === item.id}
                          title="Ripristina"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {restoring === item.id ? "Ripristino..." : "Ripristina"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePermanently(item)}
                          disabled={deleting === item.id}
                          title="Elimina definitivamente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* General Entries in Trash */}
          {generalEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Dati Classifica Generale
                  <Badge variant="secondary" className="ml-2">
                    {generalEntries.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generalEntries.map((item) => (
                    <div
                      key={`entry-${item.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.totalPoints} punti • Eliminato il {formatDate(item.deletedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(item)}
                          disabled={restoring === item.id}
                          title="Ripristina"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {restoring === item.id ? "Ripristino..." : "Ripristina"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePermanently(item)}
                          disabled={deleting === item.id}
                          title="Elimina definitivamente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            I dati vengono eliminati automaticamente dopo 5 giorni
          </div>
        </div>
      )}
    </div>
  );
}
