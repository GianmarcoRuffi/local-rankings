"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, Pencil, Trophy, List, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useRanking } from "@/hooks/useRanking";
import { Ranking } from "@/types/ranking";
import { toast } from "@/hooks/use-toast";

interface RankingSelectorProps {
  onRankingChange?: (ranking: Ranking | null) => void;
}

export function RankingSelector({ onRankingChange }: RankingSelectorProps) {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const { rankings, selectedRanking, setSelectedRanking, refreshRankings } =
    useRanking();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rankingToEdit, setRankingToEdit] = useState<Ranking | null>(null);
  const [rankingToDelete, setRankingToDelete] = useState<Ranking | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSelectRanking = (rankingId: string) => {
    const ranking = rankings.find((r) => String(r.id) === rankingId);
    if (ranking) {
      setSelectedRanking(ranking);
      onRankingChange?.(ranking);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({
        title: "Errore",
        description: "Il nome è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          is_default: rankings.length === 0,
        }),
      });

      if (res.ok) {
        toast({
          title: "Classifica creata",
          description: `La classifica "${newName}" è stata creata.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        setNewName("");
        setNewDescription("");
        setCreateDialogOpen(false);
        await refreshRankings();
      } else {
        const data = await res.json();
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

  const handleEdit = async () => {
    if (!rankingToEdit || !newName.trim()) {
      toast({
        title: "Errore",
        description: "Il nome è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/rankings/${rankingToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          is_default: rankingToEdit.is_default,
        }),
      });

      if (res.ok) {
        toast({
          title: "Classifica aggiornata",
          description: `La classifica "${newName}" è stata aggiornata.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        setNewName("");
        setNewDescription("");
        setEditDialogOpen(false);
        setRankingToEdit(null);
        await refreshRankings();
      } else {
        const data = await res.json();
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

  const handleDelete = async () => {
    if (!rankingToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/rankings/${rankingToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Classifica eliminata",
          description: `La classifica "${rankingToDelete.name}" è stata eliminata.`,
          variant: "success" as Parameters<typeof toast>[0]["variant"],
        });
        setDeleteDialogOpen(false);
        setRankingToDelete(null);
        await refreshRankings();
      } else {
        const data = await res.json();
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (ranking: Ranking) => {
    setRankingToEdit(ranking);
    setNewName(ranking.name);
    setNewDescription(ranking.description || "");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (ranking: Ranking) => {
    setRankingToDelete(ranking);
    setDeleteDialogOpen(true);
  };

  const handleCopyShareLink = async () => {
    if (!selectedRanking) return;

    const url = new URL(window.location.href);
    url.searchParams.set("rankingId", String(selectedRanking.id));

    try {
      await navigator.clipboard.writeText(url.toString());
      toast({
        title: "Link copiato",
        description: "Il link della classifica è stato copiato negli appunti.",
        variant: "success" as Parameters<typeof toast>[0]["variant"],
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Non è stato possibile copiare il link.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={selectedRanking ? String(selectedRanking.id) : ""}
          onValueChange={handleSelectRanking}
        >
          <SelectTrigger className="w-[220px] cursor-pointer">
            <List className="h-4 w-4 mr-2" />
            <span className="truncate">
              {selectedRanking?.name || "Seleziona classifica"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {rankings.map((ranking) => (
              <SelectItem key={ranking.id} value={String(ranking.id)}>
                <div className="flex items-center gap-2">
                  <span>{ranking.name}</span>
                  {ranking.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAuthenticated && (
          <div className="flex items-center gap-1 px-1 border-l border-border ml-1 pl-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setNewName("");
                setNewDescription("");
                setCreateDialogOpen(true);
              }}
              title="Crea nuova classifica"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {selectedRanking && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyShareLink}
                  title="Copia link della classifica"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(selectedRanking)}
                  title="Modifica classifica"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!selectedRanking.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(selectedRanking)}
                    title="Elimina classifica"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Nuova Classifica
            </DialogTitle>
            <DialogDescription>
              Crea una nuova classifica generale. Ogni classifica ha le proprie
              tappe e classifica cumulativa indipendente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="createName">Nome *</Label>
              <Input
                id="createName"
                placeholder="Es. Torneo Accademico"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createDescription">Descrizione</Label>
              <Input
                id="createDescription"
                placeholder="Descrizione opzionale"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creazione..." : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Classifica
            </DialogTitle>
            <DialogDescription>
              Modifica il nome e la descrizione della classifica.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nome *</Label>
              <Input
                id="editName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Descrizione</Label>
              <Input
                id="editDescription"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminare la classifica?
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare la classifica{" "}
              <strong>&quot;{rankingToDelete?.name}&quot;</strong>. Questa
              operazione è <strong>irreversibile</strong>: tutti i dati della
              classifica generale verranno eliminati. Le tappe associate
              verranno scollegate ma non eliminate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
