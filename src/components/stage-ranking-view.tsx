"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Merge,
  RefreshCw,
  Flag,
  CheckCircle,
  Clock,
  Trash2,
  Pencil,
  Check,
  X,
  Undo2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stage, StageRankingPlayer, SortConfig } from "@/types/ranking";
import { toast } from "@/hooks/use-toast";

function SortIcon({ column, sortConfig }: { column: string; sortConfig: SortConfig }) {
  if (sortConfig.key !== column)
    return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />;
  return sortConfig.direction === "asc"
    ? <ChevronUp className="h-4 w-4 ml-1" />
    : <ChevronDown className="h-4 w-4 ml-1" />;
}

function StatusBadge({ status }: { status: Stage["status"] }) {
  if (status === "merged")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Inserita
      </Badge>
    );
  if (status === "active")
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Da inserire
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      In attesa
    </Badge>
  );
}

function T1Badge({ t1 }: { t1: number }) {
  const value = t1 || 0;
  if (value > 0) {
    return (
      <Badge variant="outline" className="font-bold text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700 dark:text-green-400">
        +{value}
      </Badge>
    );
  }
  if (value < 0) {
    return (
      <Badge variant="outline" className="font-bold text-red-600 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700 dark:text-red-400">
        {value}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-bold text-muted-foreground">
      0
    </Badge>
  );
}

interface EditState {
  name: string;
  points_awarded: string;
  t1: string;
  presenze: string;
}

interface StageEditState {
  name: string;
  date: string;
}

export function StageRankingView() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [players, setPlayers] = useState<StageRankingPlayer[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [merging, setMerging] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "position",
    direction: "asc",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", points_awarded: "", t1: "", presenze: "" });
  const [saving, setSaving] = useState(false);
  const [deletePlayerDialogOpen, setDeletePlayerDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<StageRankingPlayer | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState(false);
  const [editingStage, setEditingStage] = useState(false);
  const [stageEditState, setStageEditState] = useState<StageEditState>({ name: "", date: "" });
  const [savingStage, setSavingStage] = useState(false);

  const fetchStages = useCallback(async () => {
    setLoadingStages(true);
    try {
      const res = await fetch("/api/ranking/stages");
      if (res.ok) {
        const data = await res.json();
        setStages(data);
        if (data.length > 0 && !selectedStage) {
          setSelectedStage(data[0]);
        }
      }
    } finally {
      setLoadingStages(false);
    }
  }, [selectedStage]);

  const fetchPlayers = useCallback(async (stageId: number) => {
    setLoadingPlayers(true);
    try {
      const res = await fetch(`/api/ranking/stages/${stageId}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedStage) {
      fetchPlayers(selectedStage.id);
    }
  }, [selectedStage, fetchPlayers]);

  const handleMerge = async () => {
    if (!selectedStage) return;
    setMerging(true);
    try {
      const res = await fetch("/api/ranking/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: selectedStage.id }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Tappa unita con successo!",
          description: data.message,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        await fetchStages();
        router.refresh();
      } else {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
      }
    } finally {
      setMerging(false);
    }
  };

  const handleRevertMerge = async () => {
    if (!selectedStage) return;
    setReverting(true);
    try {
      const res = await fetch("/api/ranking/merge/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: selectedStage.id }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Merge annullato",
          description: data.message,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        await fetchStages();
        router.refresh();
      } else {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
      }
    } finally {
      setReverting(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ranking/stages/${stageToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Tappa eliminata",
          description: `La tappa "${stageToDelete.name}" è stata eliminata.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        setDeleteDialogOpen(false);
        if (selectedStage?.id === stageToDelete.id) {
          setSelectedStage(null);
          setPlayers([]);
        }
        setStageToDelete(null);
        await fetchStages();
      } else {
        toast({ title: "Errore", description: data.error, variant: "destructive" });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete || !selectedStage) return;
    setDeletingPlayer(true);
    try {
      const res = await fetch(
        `/api/ranking/stages/${selectedStage.id}/players/${playerToDelete.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Giocatore eliminato",
          description: `"${playerToDelete.name}" è stato rimosso dalla tappa.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        setDeletePlayerDialogOpen(false);
        setPlayerToDelete(null);
        await fetchPlayers(selectedStage.id);
      } else {
        toast({ title: "Errore", description: data.error, variant: "destructive" });
      }
    } finally {
      setDeletingPlayer(false);
    }
  };

  const startEdit = (player: StageRankingPlayer) => {
    setEditingId(player.id);
    setEditState({
      name: player.name,
      points_awarded: String(player.points_awarded),
      t1: String(player.t1 ?? 0),
      presenze: String(player.presenze),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (player: StageRankingPlayer) => {
    if (!selectedStage) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ranking/stages/${selectedStage.id}/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name,
          points_awarded: parseInt(editState.points_awarded) || 0,
          t1: parseInt(editState.t1) || 0,
          presenze: parseInt(editState.presenze) || 1,
        }),
      });
      if (res.ok) {
        toast({ title: "Salvato", description: "Giocatore aggiornato.", variant: "success" as Parameters<typeof toast>[0]["variant"] });
        setEditingId(null);
        await fetchPlayers(selectedStage.id);
      } else {
        const data = await res.json();
        toast({ title: "Errore", description: data.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const startStageEdit = (stage: Stage) => {
    setEditingStage(true);
    setStageEditState({
      name: stage.name,
      date: stage.date ?? "",
    });
  };

  const cancelStageEdit = () => {
    setEditingStage(false);
  };

  const saveStageEdit = async () => {
    if (!currentSelectedStage) return;
    setSavingStage(true);
    try {
      const res = await fetch(`/api/ranking/stages/${currentSelectedStage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stageEditState.name,
          date: stageEditState.date || null,
        }),
      });
      if (res.ok) {
        toast({
          title: "Tappa aggiornata",
          description: "Nome e data della tappa sono stati salvati.",
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        setEditingStage(false);
        await fetchStages();
      } else {
        const data = await res.json();
        toast({ title: "Errore", description: data.error, variant: "destructive" });
      }
    } finally {
      setSavingStage(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortConfig.key as keyof StageRankingPlayer];
    const bVal = b[sortConfig.key as keyof StageRankingPlayer];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    const comparison = String(aVal).localeCompare(String(bVal), "it");
    return sortConfig.direction === "asc" ? comparison : -comparison;
  });

  const SortableHead = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center">
        {children}
        <SortIcon column={column} sortConfig={sortConfig} />
      </div>
    </TableHead>
  );

  const currentSelectedStage = stages.find((s) => s.id === selectedStage?.id) ?? selectedStage;
  const isActive = currentSelectedStage?.status === "active";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Tappe giocate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStages ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Caricamento tappe...
            </div>
          ) : stages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nessuna tappa disponibile</p>
              <p className="text-sm">Carica un PDF dalla sezione &quot;Carica PDF&quot;</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-1">
                  <Button
                    variant={selectedStage?.id === stage.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStage(stage)}
                    className="gap-2"
                  >
                    {stage.name}
                    <StatusBadge status={stage.status} />
                  </Button>
                  {isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setStageToDelete(stage);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {currentSelectedStage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              {isAuthenticated && editingStage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={stageEditState.name}
                    onChange={(e) => setStageEditState((s) => ({ ...s, name: e.target.value }))}
                    className="h-8 w-48"
                    placeholder="Nome tappa"
                  />
                  <Input
                    type="date"
                    value={stageEditState.date}
                    onChange={(e) => setStageEditState((s) => ({ ...s, date: e.target.value }))}
                    className="h-8 w-40"
                  />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={saveStageEdit} disabled={savingStage}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={cancelStageEdit} disabled={savingStage}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  {currentSelectedStage.name}
                  <StatusBadge status={currentSelectedStage.status} />
                  <Badge variant="secondary">{players.length} giocatori</Badge>
                  {isAuthenticated && isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => startStageEdit(currentSelectedStage)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardTitle>
              )}
              {!editingStage && currentSelectedStage.date && (
                <p className="text-sm text-muted-foreground mt-1">
                  Data:{" "}
                  {new Date(currentSelectedStage.date).toLocaleDateString("it-IT")}
                </p>
              )}
            </div>
            {isAuthenticated && (
              <div className="flex gap-2">
                {currentSelectedStage.status === "merged" ? (
                  <Button
                    variant="outline"
                    onClick={handleRevertMerge}
                    disabled={reverting}
                    className="gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    {reverting ? "Annullamento..." : "Annulla inserimento"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleMerge}
                    disabled={merging || players.length === 0}
                    className="gap-2"
                  >
                    <Merge className="h-4 w-4" />
                    {merging ? "Unione in corso..." : "Inserisci nella classifica generale"}
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loadingPlayers ? (
              <div className="flex justify-center py-12">
                <div className="text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Caricamento...
                </div>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun giocatore in questa tappa
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="position">Pos.</SortableHead>
                    <SortableHead column="name">Giocatore</SortableHead>
                    <SortableHead column="points_awarded">Punti Classifica</SortableHead>
                    <SortableHead column="t1">T1</SortableHead>
                    <SortableHead column="presenze">Presenze</SortableHead>
                    {isAuthenticated && isActive && <TableHead className="w-24">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {player.position}°
                      </TableCell>
                      {isAuthenticated && isActive && editingId === player.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editState.name}
                              onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                              className="h-8 w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editState.points_awarded}
                              onChange={(e) => setEditState((s) => ({ ...s, points_awarded: e.target.value }))}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editState.t1}
                              onChange={(e) => setEditState((s) => ({ ...s, t1: e.target.value }))}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editState.presenze}
                              onChange={(e) => setEditState((s) => ({ ...s, presenze: e.target.value }))}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => saveEdit(player)} disabled={saving}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={cancelEdit} disabled={saving}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">
                            {player.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-bold">
                              +{player.points_awarded} pt
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <T1Badge t1={player.t1} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{player.presenze}</Badge>
                          </TableCell>
                          {isAuthenticated && isActive && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(player)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setPlayerToDelete(player);
                                    setDeletePlayerDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminare la tappa?
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare la tappa{" "}
              <strong>&quot;{stageToDelete?.name}&quot;</strong>. Questa operazione è{" "}
              <strong>irreversibile</strong>: tutti i dati dei giocatori di questa tappa
              verranno cancellati definitivamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeleteStage} disabled={deleting}>
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sì, elimina
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePlayerDialogOpen} onOpenChange={setDeletePlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminare il giocatore?
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare{" "}
              <strong>&quot;{playerToDelete?.name}&quot;</strong> dalla tappa. Le posizioni
              verranno ricalcolate automaticamente. Questa operazione è{" "}
              <strong>irreversibile</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlayerDialogOpen(false)} disabled={deletingPlayer}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeletePlayer} disabled={deletingPlayer}>
              {deletingPlayer ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sì, elimina
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
