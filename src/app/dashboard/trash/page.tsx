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
  Users,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RankingItem {
  id: number;
  name: string;
  deletedAt: string;
  type: "ranking";
}

interface GeneralRankingGroup {
  rankingId: number;
  rankingName: string;
  entryCount: number;
  deletedAt: string;
  totalPoints: number;
  type: "generalRankingGroup";
}

interface StageItem {
  id: number;
  name: string;
  deletedAt: string;
  type: "stage";
}

type TrashItem = RankingItem | GeneralRankingGroup | StageItem;

export default function TrashPage() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [generalGroups, setGeneralGroups] = useState<GeneralRankingGroup[]>([]);
  const [stages, setStages] = useState<StageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  
  // Modale di conferma
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<"restore" | "delete" | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ranking/trash");
      if (res.ok) {
        const data = await res.json();
        
        // Transform rankings
        const transformedRankings: RankingItem[] = data.rankings.map(
          (r: { id: number; name: string; deletedAt: Date }) => ({
            id: r.id,
            name: r.name,
            deletedAt: r.deletedAt,
            type: "ranking" as const,
          })
        );
        setRankings(transformedRankings);

        // Transform general ranking groups
        const transformedGroups: GeneralRankingGroup[] = data.generalRankingGroups?.map(
          (g: { rankingId: number; rankingName: string; entryCount: number; deletedAt: Date; totalPoints: number }) => ({
            rankingId: g.rankingId,
            rankingName: g.rankingName,
            entryCount: g.entryCount,
            deletedAt: g.deletedAt,
            totalPoints: g.totalPoints,
            type: "generalRankingGroup" as const,
          })
        ) || [];
        setGeneralGroups(transformedGroups);

        // Transform stages
        const transformedStages: StageItem[] = data.stages?.map(
          (s: { id: number; name: string; deletedAt: Date }) => ({
            id: s.id,
            name: s.name,
            deletedAt: s.deletedAt,
            type: "stage" as const,
          })
        ) || [];
        setStages(transformedStages);
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

  const openConfirmDialog = (item: TrashItem, action: "restore" | "delete") => {
    setItemToDelete(item);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!itemToDelete || !confirmAction) return;

    if (confirmAction === "restore") {
      await executeRestore(itemToDelete);
    } else {
      await executeDelete(itemToDelete);
    }
    
    setConfirmDialogOpen(false);
    setItemToDelete(null);
    setConfirmAction(null);
  };

  const executeRestore = async (item: TrashItem) => {
    const itemId = item.type === "generalRankingGroup" ? item.rankingId : item.id;
    setRestoring(itemId);
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
      } else if (item.type === "generalRankingGroup") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restoreGeneralRanking",
            rankingId: item.rankingId,
          }),
        });
      } else if (item.type === "stage") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restoreStage",
            stageId: item.id,
          }),
        });
      }

      if (res?.ok) {
        toast({
          title: "Ripristinato",
          description: getItemName(item) + " è stato ripristinato.",
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

  const executeDelete = async (item: TrashItem) => {
    const itemId = item.type === "generalRankingGroup" ? item.rankingId : item.id;
    setDeleting(itemId);
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
      } else if (item.type === "generalRankingGroup") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deletePermanentlyGeneralRanking",
            rankingId: item.rankingId,
          }),
        });
      } else if (item.type === "stage") {
        res = await fetch("/api/ranking/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deletePermanentlyStage",
            stageId: item.id,
          }),
        });
      }

      if (res?.ok) {
        toast({
          title: "Eliminato",
          description: getItemName(item) + " è stato eliminato definitivamente.",
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

  const getItemName = (item: TrashItem): string => {
    if (item.type === "ranking") return item.name;
    if (item.type === "generalRankingGroup") return item.rankingName;
    return item.name;
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

  const hasItems = rankings.length > 0 || generalGroups.length > 0 || stages.length > 0;

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
                          onClick={() => openConfirmDialog(item, "restore")}
                          disabled={restoring === item.id}
                          title="Ripristina"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {restoring === item.id ? "Ripristino..." : "Ripristina"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openConfirmDialog(item, "delete")}
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

          {/* General Ranking Groups in Trash */}
          {generalGroups.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Dati Classifica Generale
                  <Badge variant="secondary" className="ml-2">
                    {generalGroups.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generalGroups.map((item) => (
                    <div
                      key={`group-${item.rankingId}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{item.rankingName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.entryCount} giocatori</span>
                            <span>•</span>
                            <span>{item.totalPoints} punti totali</span>
                            <span>•</span>
                            <span>Eliminato il {formatDate(item.deletedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConfirmDialog(item, "restore")}
                          disabled={restoring === item.rankingId}
                          title="Ripristina tutta la classifica"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {restoring === item.rankingId ? "Ripristino..." : "Ripristina"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openConfirmDialog(item, "delete")}
                          disabled={deleting === item.rankingId}
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

          {/* Stages in Trash */}
          {stages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-green-500" />
                  Tappe
                  <Badge variant="secondary" className="ml-2">
                    {stages.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stages.map((item) => (
                    <div
                      key={`stage-${item.id}`}
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
                          onClick={() => openConfirmDialog(item, "restore")}
                          disabled={restoring === item.id}
                          title="Ripristina"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {restoring === item.id ? "Ripristino..." : "Ripristina"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openConfirmDialog(item, "delete")}
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

      {/* Dialog di conferma */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              {confirmAction === "delete" ? (
                <>
                  <Trash2 className="h-5 w-5" />
                  Conferma eliminazione definitiva
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5" />
                  Conferma ripristino
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "delete" ? (
                <>
                  Stai per eliminare definitivamente <strong>&quot;{itemToDelete ? getItemName(itemToDelete) : ""}&quot;</strong>.
                  {itemToDelete?.type === "generalRankingGroup" && (
                    <> Questa azione eliminerà <strong>{(itemToDelete as GeneralRankingGroup).entryCount} giocatori</strong> in modo permanente.</>
                  )}
                  {" "}Questa operazione è <strong>irreversibile</strong>.
                </>
              ) : (
                <>
                  Stai per ripristinare <strong>&quot;{itemToDelete ? getItemName(itemToDelete) : ""}&quot;</strong>.
                  {itemToDelete?.type === "generalRankingGroup" && (
                    <> Verranno ripristinati <strong>{(itemToDelete as GeneralRankingGroup).entryCount} giocatori</strong>.</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setItemToDelete(null);
                setConfirmAction(null);
              }}
              disabled={restoring !== null || deleting !== null}
            >
              Annulla
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={restoring !== null || deleting !== null}
            >
              {confirmAction === "delete" ? (
                deleting !== null ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sì, elimina definitivamente
                  </>
                )
              ) : restoring !== null ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Ripristino...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Sì, ripristina
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
