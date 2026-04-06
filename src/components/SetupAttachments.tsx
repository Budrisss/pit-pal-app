import { useRef, useState } from "react";
import { Download, Eye, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Attachment {
  id: string;
  setup_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

interface SetupAttachmentsProps {
  attachments: Attachment[];
  setupId: string | null;
  userId: string;
  onChanged: () => void;
  compact?: boolean;
}

/** Extract the raw storage path from either a raw path or a signed/public URL */
const getStoragePath = (fileUrl: string) => {
  if (fileUrl.includes("/object/sign/setup-attachments/")) {
    return decodeURIComponent(fileUrl.split("/object/sign/setup-attachments/").pop()!.split("?")[0]);
  }
  if (fileUrl.includes("/setup-attachments/")) {
    return decodeURIComponent(fileUrl.split("/setup-attachments/").pop()!.split("?")[0]);
  }
  return fileUrl;
};

/** Get a fresh signed URL for a given attachment */
const getFreshSignedUrl = async (att: Attachment): Promise<string | null> => {
  const storagePath = getStoragePath(att.file_url);
  const { data } = await supabase.storage
    .from("setup-attachments")
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
};

const SetupAttachments = ({ attachments, setupId, userId, onChanged, compact }: SetupAttachmentsProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImage = (type: string | null) => type?.startsWith("image/");
  const isPdf = (type: string | null) => type === "application/pdf";

  // Use the file_url directly — Setups.tsx already resolves signed URLs
  // If file_url looks like a raw path (no http), generate a signed URL on the fly
  const getDisplayUrl = async (att: Attachment): Promise<string> => {
    if (att.file_url.startsWith("http")) return att.file_url;
    const signed = await getFreshSignedUrl(att);
    return signed || att.file_url;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const isImageFile = file.type.startsWith("image/");
      const isPdfFile = file.type === "application/pdf";

      if (!isImageFile && !isPdfFile) {
        toast({ title: "Invalid file", description: "Only images and PDFs are allowed", variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB per file", variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("setup-attachments")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      await (supabase as any).from("setup_attachments").insert({
        setup_id: setupId,
        user_id: userId,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
      });
    }

    setUploading(false);
    onChanged();
    toast({ title: "Uploaded", description: "File(s) uploaded successfully" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (att: Attachment) => {
    const storagePath = getStoragePath(att.file_url);
    if (storagePath) {
      await supabase.storage.from("setup-attachments").remove([storagePath]);
    }
    await (supabase as any).from("setup_attachments").delete().eq("id", att.id);
    onChanged();
    toast({ title: "Deleted", description: "Attachment removed" });
  };

  const openPreview = async (att: Attachment) => {
    const url = await getDisplayUrl(att);
    setPreviewFileName(att.file_name);
    setPreviewType(isPdf(att.file_type) ? "pdf" : "image");
    setPreviewUrl(url);
  };

  const handleDownload = async () => {
    if (!previewUrl || !previewFileName) return;
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = previewFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(previewUrl, "_blank");
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        className={compact ? "" : "w-full"}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload size={14} className="mr-2" />
        {uploading ? "Uploading..." : "Upload Image or PDF"}
      </Button>

      {attachments.length > 0 && (
        <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
          {attachments.map((att) => (
            <div key={att.id} className="relative group overflow-hidden rounded-lg border border-border/50 bg-muted/30">
              {isImage(att.file_type) ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="h-24 w-full cursor-pointer object-cover"
                  onClick={() => openPreview(att)}
                />
              ) : (
                <div
                  className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1"
                  onClick={() => openPreview(att)}
                >
                  <FileText size={24} className="text-primary" />
                  <span className="max-w-[90%] truncate px-1 text-[10px] text-muted-foreground">{att.file_name}</span>
                </div>
              )}
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => openPreview(att)} className="rounded-full bg-background/80 p-1">
                  <Eye size={12} className="text-foreground" />
                </button>
                <button onClick={() => handleDelete(att)} className="rounded-full bg-destructive/80 p-1">
                  <X size={12} className="text-destructive-foreground" />
                </button>
              </div>
              <p className="truncate px-1 py-0.5 text-[9px] text-muted-foreground">{att.file_name}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUrl(null);
            setPreviewFileName(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[95vw] p-2">
          <DialogHeader>
            <DialogTitle>Setup Sheet</DialogTitle>
          </DialogHeader>

          {previewUrl && previewType === "image" && (
            <img src={previewUrl} alt="Setup preview" className="h-auto max-h-[70vh] w-full rounded object-contain" />
          )}

          {previewUrl && previewType === "pdf" && (
            <iframe src={previewUrl} className="h-[65vh] w-full rounded border border-border/50" title="PDF Preview" />
          )}

          {previewUrl && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button onClick={handleDownload} size="sm">
                <Download size={16} className="mr-2" />
                Download
              </Button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                Open in new tab
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetupAttachments;
