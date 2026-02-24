"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Merge,
  RefreshCw,
  Flag,
  CheckCircle,
  Clock,
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
import { Stage, StageRankingPlayer, SortConfig } from "@/types/ranking";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

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
        Unita
      </Badge>
    );
  if (status === "active")
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Attiva
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

export function StageRankingView() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [players, setPlayers] = useState<StageRankingPlayer[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [merging, setMerging] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "position",
    direction: "asc",
  });

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Tappe disponibili
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
                <Button
                  key={stage.id}
                  variant={selectedStage?.id === stage.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStage(stage)}
                  className="gap-2"
                >
                  {stage.name}
                  <StatusBadge status={stage.status} />
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedStage.name}
                <StatusBadge status={selectedStage.status} />
                <Badge variant="secondary">{players.length} giocatori</Badge>
              </CardTitle>
              {selectedStage.date && (
                <p className="text-sm text-muted-foreground mt-1">
                  Data:{" "}
                  {new Date(selectedStage.date).toLocaleDateString("it-IT")}
                </p>
              )}
            </div>
            {selectedStage.status !== "merged" && (
              <Button
                onClick={handleMerge}
                disabled={merging || players.length === 0}
                className="gap-2"
              >
                <Merge className="h-4 w-4" />
                {merging ? "Unione in corso..." : "Unisci alla classifica generale"}
              </Button>
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
                    <SortableHead column="score">Punteggio</SortableHead>
                    <SortableHead column="points_awarded">Punti Classifica</SortableHead>
                    <SortableHead column="t1">T1</SortableHead>
                    <SortableHead column="presenze">Presenze</SortableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {player.position}°
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.name}
                      </TableCell>
                      <TableCell>
                        {player.score !== null && player.score !== undefined
                          ? player.score
                          : "—"}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
