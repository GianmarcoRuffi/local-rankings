"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trophy,
  RefreshCw,
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
import { GeneralRankingPlayer, SortConfig } from "@/types/ranking";

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

export function GeneralRankingTable() {
  const [players, setPlayers] = useState<GeneralRankingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "total_points",
    direction: "desc",
  });

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Classifica Generale
          <Badge variant="secondary">{players.length} giocatori</Badge>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchPlayers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
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
            <p className="text-sm">Carica una tappa PDF per iniziare</p>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
