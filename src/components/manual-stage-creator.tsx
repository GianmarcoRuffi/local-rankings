"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Save, CheckCircle, RefreshCw, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useRanking } from "@/hooks/useRanking";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { capitalizeName, t1Comparator } from "@/lib/ranking-logic";

interface PlayerData {
  id: string;
  name: string;
  wins: string;
  t1: string;
}

export function ManualStageCreator() {
  const router = useRouter();
  const { selectedRanking } = useRanking();
  const [stageName, setStageName] = useState("");
  const [stageDate, setStageDate] = useState("");
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "1", name: "", wins: "", t1: "0" },
    { id: "2", name: "", wins: "", t1: "0" },
    { id: "3", name: "", wins: "", t1: "0" },
  ]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ stageId: number; playersCount: number } | null>(null);

  const playersWithPositions = useMemo(() => {
    const withPoints = players.map((p) => ({
      ...p,
      points: Math.max(0, parseInt(p.wins) || 0) * 3,
      t1Num: parseInt(p.t1) || 0,
    }));
    const sorted = [...withPoints].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return t1Comparator(a.t1Num, b.t1Num);
    });
    return sorted.map((p, index) => ({
      ...p,
      position: index + 1,
    }));
  }, [players]);

  const addPlayer = () => {
    setPlayers([
      ...players,
      {
        id: Date.now().toString(),
        name: "",
        wins: "",
        t1: "0",
      },
    ]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= 1) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  const updatePlayer = (id: string, field: keyof PlayerData, value: string) => {
    if (field === "wins") {
      const numValue = parseInt(value) || 0;
      if (numValue < 0) return;
    }
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async () => {
    if (!selectedRanking) {
      toast({
        title: "Errore",
        description: "Seleziona una classifica prima di creare la tappa",
        variant: "destructive",
      });
      return;
    }

    if (!stageName.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il nome della tappa",
        variant: "destructive",
      });
      return;
    }

    const validPlayers = players.filter((p) => p.name.trim());
    if (validPlayers.length === 0) {
      toast({
        title: "Errore",
        description: "Inserisci almeno un giocatore",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const playersToSave = playersWithPositions.filter((p) => p.name.trim());
      const payload = {
        name: stageName.trim(),
        date: stageDate || null,
        rankingId: selectedRanking.id,
        players: playersToSave.map((p) => ({
          position: p.position,
          name: capitalizeName(p.name.trim()),
          points_awarded: p.points,
          t1: p.t1Num,
          presenze: 1,
        })),
      };

      const res = await fetch("/api/ranking/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        toast({
          title: "Tappa creata con successo!",
          description: `${data.playersCount} giocatori aggiunti alla tappa "${data.name}"`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
      } else {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStageName("");
    setStageDate("");
    setPlayers([
      { id: "1", name: "", wins: "", t1: "0" },
      { id: "2", name: "", wins: "", t1: "0" },
      { id: "3", name: "", wins: "", t1: "0" },
    ]);
    setResult(null);
  };

  if (result) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Tappa creata con successo!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="success">{result.playersCount} giocatori</Badge>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push("/dashboard/stage")} className="gap-2">
                <Trophy className="h-4 w-4" />
                Vai alla Tappa
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <Plus className="h-4 w-4" />
                Crea un&apos;altra tappa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Dati Tappa
            {selectedRanking && (
              <Badge variant="secondary" className="ml-2">
                {selectedRanking.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedRanking && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 rounded-lg">
              Seleziona una classifica dal menu in alto per creare la tappa.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nome Tappa *</Label>
              <Input
                id="stageName"
                placeholder="Es. Tappa 1 - Milano"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stageDate">Data Tappa</Label>
              <Input
                id="stageDate"
                type="date"
                value={stageDate}
                onChange={(e) => setStageDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Giocatori
            <Badge variant="secondary">{players.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Pos.</TableHead>
                  <TableHead>Giocatore *</TableHead>
                  <TableHead className="w-28">Partite Vinte</TableHead>
                  <TableHead className="w-28">Punti Classifica</TableHead>
                  <TableHead className="w-24">T1</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => {
                  const playerWithPos = playersWithPositions.find((p) => p.id === player.id);
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {playerWithPos?.position}°
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Nome giocatore"
                          value={player.name}
                          onChange={(e) => updatePlayer(player.id, "name", e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={player.wins}
                          onChange={(e) => updatePlayer(player.id, "wins", e.target.value)}
                          className="h-8 w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">
                          +{playerWithPos?.points ?? 0} pt
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={player.t1}
                          onChange={(e) => updatePlayer(player.id, "t1", e.target.value)}
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removePlayer(player.id)}
                          disabled={players.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Button
            variant="outline"
            onClick={addPlayer}
            className="mt-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            Aggiungi giocatore
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !selectedRanking}
          className="gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salva Tappa
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          Reset
        </Button>
      </div>
    </div>
  );
}
