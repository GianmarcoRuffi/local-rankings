"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, Trophy } from "lucide-react";
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

interface UploadResult {
  stageId: number;
  stageName: string;
  playersCount: number;
  players: Array<{
    position: number;
    name: string;
    score: number | null;
    points: number;
    t1: number;
  }>;
}

export function PdfUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageDate, setStageDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Solo file PDF sono supportati");
      return;
    }
    setFile(selected);
    setError(null);
    setResult(null);
    if (!stageName) {
      setStageName(selected.name.replace(".pdf", "").replace(/_/g, " "));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    handleFileSelect(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (stageName) formData.append("stageName", stageName);
      if (stageDate) formData.append("stageDate", stageDate);

      const res = await fetch("/api/ranking/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        toast({
          title: "PDF caricato con successo!",
          description: `${data.playersCount} giocatori importati per la tappa "${data.stageName}"`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
      } else {
        setError(data.error || "Errore durante il caricamento");
        toast({
          title: "Errore caricamento",
          description: data.error,
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStageName("");
    setStageDate("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importa Classifica PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Trascina il PDF qui o clicca per selezionare</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supporta file PDF con la classifica della tappa
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Nome Tappa</Label>
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

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 animate-bounce" />
                  Elaborazione...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Carica e Analizza PDF
                </>
              )}
            </Button>
            {result && (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/stage")}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                Vai alla Tappa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Risultato importazione: {result.stageName}
              <Badge variant="success">{result.playersCount} giocatori</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posizione</TableHead>
                  <TableHead>Giocatore</TableHead>
                  <TableHead>Punteggio</TableHead>
                  <TableHead>Punti Classifica</TableHead>
                  <TableHead>T1</TableHead>
                  <TableHead>Presenze</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.players.map((player) => (
                  <TableRow key={player.position}>
                    <TableCell className="font-medium">{player.position}°</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.score ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        +{player.points} pt
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        {player.t1 > 0 ? `+${player.t1}` : player.t1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">1</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
