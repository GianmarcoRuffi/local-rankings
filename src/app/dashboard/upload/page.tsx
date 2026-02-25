"use client";

import { useState } from "react";
import { Upload, Plus } from "lucide-react";
import { PdfUploader } from "@/components/pdf-uploader";
import { ManualStageCreator } from "@/components/manual-stage-creator";
import { Button } from "@/components/ui/button";

type TabType = "upload" | "manual";

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<TabType>("upload");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestione Tappe</h1>
        <p className="text-muted-foreground mt-1">
          Carica la classifica di una tappa o creala manualmente
        </p>
      </div>

      <div className="flex gap-2 border-b pb-1">
        <Button
          variant={activeTab === "upload" ? "default" : "ghost"}
          onClick={() => setActiveTab("upload")}
          className="gap-2 rounded-b-none"
        >
          <Upload className="h-4 w-4" />
          Carica PDF
        </Button>
        <Button
          variant={activeTab === "manual" ? "default" : "ghost"}
          onClick={() => setActiveTab("manual")}
          className="gap-2 rounded-b-none"
        >
          <Plus className="h-4 w-4" />
          Crea Tappa Manualmente
        </Button>
      </div>

      {activeTab === "upload" ? <PdfUploader /> : <ManualStageCreator />}
    </div>
  );
}
