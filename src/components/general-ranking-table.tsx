"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trophy,
  RefreshCw,
  Trash2,
  Pencil,
  Check,
  X,
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
import { GeneralRankingPlayer, SortConfig } from "@/types/ranking";
import { toast } from "@/hooks/use-toast";

function SortIcon({ column, sortConfig }: { column: string; sortConfig: SortConfig }) {
  if (sortConfig.key !== column) return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />;
  return sortConfig.direction === "asc"
    ? <ChevronUp className="h-4 w-4 ml-1" />
    : <ChevronDown className="h-4 w-4 ml-1" />;
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1)
    return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">🥇 1°</Badge>;
  if (position === 2)
    return <Badge className="bg-gray-400 text-white hover:bg-gray-400">🥈 2°</Badge>;
  if (position === 3)
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600">🥉 3°</Badge>;
  return <span className="font-medium text-muted-foreground">{position}°</span>;
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
  total_points: string;
  t1: string;
  presenze: string;
}

export function GeneralRankingTable() {
  const [players, setPlayers] = useState<GeneralRankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "total_points",
    direction: "desc",
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", total_points: "", t1: "", presenze: "" });
  const [saving, setSaving] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ranking/general");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/ranking/general/reset", { method: "POST" });
      if (res.ok) {
        toast({ title: "Classifica azzerata", description: "Tutti i dati della classifica generale sono stati eliminati.", variant: "success" as Parameters<typeof toast>[0]["variant"] });
        setPlayers([]);
        setResetDialogOpen(false);
      } else {
        const data = await res.json();
        toast({ title: "Errore", description: data.error, variant: "destructive" });
      }
    } finally {
      setResetting(false);
    }
  };

  const startEdit = (player: GeneralRankingPlayer) => {
    setEditingId(player.id);
    setEditState({
      name: player.name,
      total_points: String(player.total_points),
      t1: String(player.t1 ?? 0),
      presenze: String(player.presenze),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (playerId: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ranking/general/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name,
          total_points: parseInt(editState.total_points) || 0,
          t1: parseInt(editState.t1) || 0,
          presenze: parseInt(editState.presenze) || 0,
        }),
      });
      if (res.ok) {
        toast({ title: "Salvato", description: "Giocatore aggiornato con successo.", variant: "success" as Parameters<typeof toast>[0]["variant"] });
        setEditingId(null);
        await fetchPlayers();
      } else {
        const data = await res.json();
        toast({ title: "Errore", description: data.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortConfig.key as keyof GeneralRankingPlayer];
    const bVal = b[sortConfig.key as keyof GeneralRankingPlayer];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    const comparison = String(aVal).localeCompare(String(bVal), "it");
    return sortConfig.direction === "asc" ? comparison : -comparison;
  });

  const SortableHead = ({ column, children }: { column: string; children: React.ReactNode }) => (
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Classifica Generale
            <Badge variant="secondary">{players.length} giocatori</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPlayers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              disabled={loading || players.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset classifica
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Caricamento...
              </div>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Nessun giocatore in classifica</p>
              <p className="text-sm">Aggiungi almeno una tappa per iniziare</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="position">Pos.</SortableHead>
                  <SortableHead column="name">Giocatore</SortableHead>
                  <SortableHead column="total_points">Punti Totali</SortableHead>
                  <SortableHead column="t1">T1</SortableHead>
                  <SortableHead column="presenze">Presenze</SortableHead>
                  <TableHead className="w-24">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlayers.map((player, index) => (
                  <TableRow
                    key={player.id}
                    className={index < 3 ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}
                  >
                    <TableCell>
                      <PositionBadge position={player.position} />
                    </TableCell>
                    {editingId === player.id ? (
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
                            value={editState.total_points}
                            onChange={(e) => setEditState((s) => ({ ...s, total_points: e.target.value }))}
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
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => saveEdit(player.id)} disabled={saving}>
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
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>
                          <span className="font-bold text-primary text-lg">
                            {player.total_points}
                          </span>
                        </TableCell>
                        <TableCell>
                          <T1Badge t1={player.t1} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{player.presenze}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(player)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Azzerare la classifica generale?
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare tutti i dati della classifica generale. Questa operazione è{" "}
              <strong>irreversibile</strong>: tutti i punti, T1, presenze e posizioni verranno
              cancellati definitivamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={resetting}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sì, azzera tutto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
