"use client";

import { useState } from "react";
import { Plus, Trash2, Save, CheckCircle, AlertCircle, RefreshCw, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPointsForPosition, capitalizeName } from "@/lib/ranking-logic";

interface PlayerData {
  id: string;
  position: number;
  name: string;
  score: string;
  points_awarded: number;
  t1: string;
}

export function ManualStageCreator() {
  const router = useRouter();
  const [stageName, setStageName] = useState("");
  const [stageDate, setStageDate] = useState("");
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "1", position: 1, name: "", score: "", points_awarded: 25, t1: "0" },
    { id: "2", position: 2, name: "", score: "", points_awarded: 18, t1: "0" },
    { id: "3", position: 3, name: "", score: "", points_awarded: 15, t1: "0" },
  ]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ stageId: number; playersCount: number } | null>(null);

  const addPlayer = () => {
    const nextPosition = players.length + 1;
    const nextPoints = getPointsForPosition(nextPosition);
    setPlayers([
      ...players,
      {
        id: Date.now().toString(),
        position: nextPosition,
        name: "",
        score: "",
        points_awarded: nextPoints,
        t1: "0",
      },
    ]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= 1) return;
    const newPlayers = players.filter((p) => p.id !== id);
    // Recalculate positions and points
    const recalculated = newPlayers.map((p, index) => ({
      ...p,
      position: index + 1,
      points_awarded: getPointsForPosition(index + 1),
    }));
    setPlayers(recalculated);
  };

  const updatePlayer = (id: string, field: keyof PlayerData, value: string | number) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        
        const updated = { ...p, [field]: value };
        
        // If position changed, recalculate points
        if (field === "position") {
          updated.points_awarded = getPointsForPosition(Number(value) || 1);
        }
        
        return updated;
      })
    );
  };

  const handleSave = async () => {
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
      const payload = {
        name: stageName.trim(),
        date: stageDate || null,
        players: validPlayers.map((p) => ({
          position: p.position,
          name: capitalizeName(p.name.trim()),
          score: p.score ? parseFloat(p.score.replace(",", ".")) : null,
          points_awarded: p.points_awarded,
          t1: parseInt(p.t1) || 0,
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
      { id: "1", position: 1, name: "", score: "", points_awarded: 25, t1: "0" },
      { id: "2", position: 2, name: "", score: "", points_awarded: 18, t1: "0" },
      { id: "3", position: 3, name: "", score: "", points_awarded: 15, t1: "0" },
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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <TableHead className="w-24">Punteggio</TableHead>
                  <TableHead className="w-24">Punti</TableHead>
                  <TableHead className="w-24">T1</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={player.position}
                        onChange={(e) => updatePlayer(player.id, "position", e.target.value)}
                        className="h-8 w-16"
                      />
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
                        placeholder="Es. 150.5"
                        value={player.score}
                        onChange={(e) => updatePlayer(player.id, "score", e.target.value)}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        +{player.points_awarded} pt
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
                ))}
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
          disabled={saving}
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
