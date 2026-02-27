"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  Download,
  FileText,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { t1Comparator } from "@/lib/ranking-logic";
import { useRanking } from "@/hooks/useRanking";
import * as XLSX from "xlsx";

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
  if (position === 4)
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600">4°</Badge>;
  if (position === 5)
    return <Badge className="bg-blue-500 text-white hover:bg-blue-500">5°</Badge>;
  if (position === 6)
    return <Badge className="bg-blue-400 text-white hover:bg-blue-400">6°</Badge>;
  if (position === 7)
    return <Badge className="bg-purple-500 text-white hover:bg-purple-500">7°</Badge>;
  if (position === 8)
    return <Badge className="bg-purple-400 text-white hover:bg-purple-400">8°</Badge>;
  if (position === 9)
    return <Badge className="bg-indigo-500 text-white hover:bg-indigo-500">9°</Badge>;
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

function getPositionColor(position: number): string {
  const colors: Record<number, string> = {
    1: "#eab308",
    2: "#9ca3af",
    3: "#d97706",
    4: "#2563eb",
    5: "#3b82f6",
    6: "#60a5fa",
    7: "#a855f7",
    8: "#c084fc",
    9: "#6366f1",
  };
  return colors[position] || "#6b7280";
}

interface EditState {
  name: string;
  total_points: string;
  t1: string;
  presenze: string;
}

export function GeneralRankingTable() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const { selectedRanking } = useRanking();
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
    if (!selectedRanking) return;
    
    setLoading(true);
    try {
      const url = `/api/ranking/general?rankingId=${selectedRanking.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRanking]);

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
    if (!selectedRanking) return;
    
    setResetting(true);
    try {
      const res = await fetch(`/api/ranking/general/reset?rankingId=${selectedRanking.id}`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Classifica azzerata", description: "Tutti i dati della classifica sono stati eliminati.", variant: "success" as Parameters<typeof toast>[0]["variant"] });
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
          ranking_id: selectedRanking?.id,
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
    const key = sortConfig.key as keyof GeneralRankingPlayer;
    const direction = sortConfig.direction;

    // Per posizione e punti: ordina prima per punti, poi per T1
    if (key === "position" || key === "total_points") {
      if (a.total_points !== b.total_points) {
        return direction === "asc"
          ? a.total_points - b.total_points
          : b.total_points - a.total_points;
      }
      // A parità di punti, usa il comparatore T1
      const t1Compare = t1Comparator(a.t1, b.t1);
      return direction === "asc" ? -t1Compare : t1Compare;
    }

    // Per T1: usa il comparatore personalizzato
    if (key === "t1") {
      const t1Compare = t1Comparator(a.t1, b.t1);
      return direction === "asc" ? -t1Compare : t1Compare;
    }

    // Per altre colonne (nome, presenze): ordinamento standard
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }
    const comparison = String(aVal).localeCompare(String(bVal), "it");
    return direction === "asc" ? comparison : -comparison;
  });

  const exportToExcel = () => {
    if (sortedPlayers.length === 0) return;

    const data = sortedPlayers.map((player) => ({
      "Posizione": player.position,
      "Giocatore": player.name,
      "Punti Totali": player.total_points,
      "T1": player.t1 ?? 0,
      "Presenze": player.presenze,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classifica Generale");

    const colWidths = [
      { wch: 10 },
      { wch: 25 },
      { wch: 15 },
      { wch: 8 },
      { wch: 10 },
    ];
    ws["!cols"] = colWidths;

    const filename = selectedRanking 
      ? `classifica_${selectedRanking.name.toLowerCase().replace(/\s+/g, '_')}.xlsx`
      : "classifica_generale.xlsx";
    XLSX.writeFile(wb, filename);
  };

  const exportToPDF = () => {
    if (sortedPlayers.length === 0) return;

    const doc = new jsPDF("p", "mm", "a4");

    // Title
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text(`Classifica ${selectedRanking?.name || "Generale"}`, 14, 15);

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `${players.length} giocatori - Esportato il ${new Date().toLocaleDateString("it-IT")}`,
      14,
      22
    );

    // Position colors helper (RGB)
    const getPositionColor = (pos: number): [number, number, number] => {
      const colors: Record<number, [number, number, number]> = {
        1: [234, 179, 8],   // yellow-500
        2: [156, 163, 175], // gray-400
        3: [217, 119, 6],   // amber-600
        4: [37, 99, 235],   // blue-600
        5: [59, 130, 246],  // blue-500
        6: [96, 165, 250],  // blue-400
        7: [168, 85, 247],  // purple-500
        8: [192, 132, 252], // purple-400
        9: [99, 102, 241],  // indigo-500
      };
      return colors[pos] || [107, 114, 128];
    };

    autoTable(doc, {
      startY: 28,
      head: [["Pos.", "Giocatore", "Punti Totali", "T1", "Presenze"]],
      body: sortedPlayers.map((p) => [
        `${p.position}°`,
        p.name,
        p.total_points,
        (p.t1 ?? 0) > 0 ? `+${p.t1}` : String(p.t1 ?? 0),
        p.presenze,
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [55, 65, 81],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" },
        1: { cellWidth: 70 },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 25, halign: "center" },
      },
      didParseCell: (hookData) => {
        const { row, column, cell } = hookData;

        // Skip header
        if (row.section === "head") return;

        const rowIndex = row.index;
        const player = sortedPlayers[rowIndex];

        // Position cell coloring (1-9)
        if (column.index === 0 && player.position <= 9) {
          cell.styles.fillColor = getPositionColor(player.position);
          cell.styles.textColor = [255, 255, 255];
          cell.styles.fontStyle = "bold";
        }

        // Row background highlighting (yellow for top 3, blue for 4-9)
        if (rowIndex < 3) {
          cell.styles.fillColor = [254, 252, 232]; // yellow-50
          if (column.index === 0 && player.position <= 9) {
            cell.styles.fillColor = getPositionColor(player.position);
          }
        } else if (rowIndex < 9) {
          cell.styles.fillColor = [239, 246, 255]; // blue-50
          if (column.index === 0 && player.position <= 9) {
            cell.styles.fillColor = getPositionColor(player.position);
          }
        }

        // T1 cell coloring
        if (column.index === 3) {
          const t1Value = player.t1 ?? 0;
          if (t1Value > 0) {
            cell.styles.textColor = [22, 163, 74]; // green-600
          } else if (t1Value < 0) {
            cell.styles.textColor = [220, 38, 38]; // red-600
          }
          cell.styles.fontStyle = "bold";
        }
      },
    });

    const filename = selectedRanking
      ? `classifica_${selectedRanking.name.toLowerCase().replace(/\s+/g, "_")}.pdf`
      : "classifica_generale.pdf";
    doc.save(filename);

    toast({
      title: "PDF esportato",
      description: "Il file è stato scaricato.",
      variant: "success" as Parameters<typeof toast>[0]["variant"],
    });
  };

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {selectedRanking?.name || "Classifica Generale"}
          <Badge variant="secondary">{players.length} giocatori</Badge>
        </CardTitle>
        {isAuthenticated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPlayers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={loading || players.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={loading || players.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Esporta PDF
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
        )}
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
                {isAuthenticated && <TableHead className="w-24">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow
                  key={player.id}
                  className={
                    index < 3
                      ? "bg-yellow-50/50 dark:bg-yellow-950/10"
                      : index < 9
                      ? "bg-blue-50/30 dark:bg-blue-950/10"
                      : ""
                  }
                >
                  <TableCell>
                    <PositionBadge position={player.position} />
                  </TableCell>
                  {isAuthenticated && editingId === player.id ? (
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
                      {isAuthenticated && (
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(player)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Azzerare la classifica?
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare tutti i dati della classifica <strong>&quot;{selectedRanking?.name}&quot;</strong>.
              Questa operazione è <strong>irreversibile</strong>: tutti i punti, T1, presenze e posizioni verranno
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
    </Card>
  );
}
