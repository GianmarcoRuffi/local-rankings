import { PdfUploader } from "@/components/pdf-uploader";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Carica PDF Tappa</h1>
        <p className="text-muted-foreground mt-1">
          Carica la classifica di una tappa in formato PDF per importarla nel sistema
        </p>
      </div>
      <PdfUploader />
    </div>
  );
}
