import { useState, useRef } from "react";
import { Upload, Image, FileText, X, Eye } from "lucide-react";
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

const SetupAttachments = ({ attachments, setupId, userId, onChanged, compact }: SetupAttachmentsProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
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
    let storagePath = att.file_url;
    if (storagePath.includes("/setup-attachments/")) {
      storagePath = decodeURIComponent(storagePath.split("/setup-attachments/").pop()!);
    }
    if (storagePath) {
      await supabase.storage.from("setup-attachments").remove([storagePath]);
    }
    await (supabase as any).from("setup_attachments").delete().eq("id", att.id);
    onChanged();
    toast({ title: "Deleted", description: "Attachment removed" });
  };

  const isImage = (type: string | null) => type?.startsWith("image/");
  const isPdf = (type: string | null) => type === "application/pdf";

  const [previewType, setPreviewType] = useState<"image" | "pdf">("image");

  const openPreview = (url: string, type: string | null) => {
    setPreviewType(isPdf(type) ? "pdf" : "image");
    setPreviewUrl(url);
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
            <div key={att.id} className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted/30">
              {isImage(att.file_type) ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="w-full h-24 object-cover cursor-pointer"
                  onClick={() => openPreview(att.file_url, att.file_type)}
                />
              ) : (
                <div
                  className="w-full h-24 flex flex-col items-center justify-center cursor-pointer gap-1"
                  onClick={() => openPreview(att.file_url, att.file_type)}
                >
                  <FileText size={24} className="text-primary" />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[90%] px-1">{att.file_name}</span>
                </div>
              )}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openPreview(att.file_url, att.file_type)} className="bg-background/80 rounded-full p-1">
                  <Eye size={12} className="text-foreground" />
                </button>
                <button onClick={() => handleDelete(att)} className="bg-destructive/80 rounded-full p-1">
                  <X size={12} className="text-destructive-foreground" />
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground truncate px-1 py-0.5">{att.file_name}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-2">
          <DialogHeader>
            <DialogTitle>Setup Sheet</DialogTitle>
          </DialogHeader>
          {previewUrl && previewType === "image" && (
            <img src={previewUrl} alt="Setup preview" className="w-full h-auto max-h-[75vh] object-contain rounded" />
          )}
          {previewUrl && previewType === "pdf" && (
            <div className="flex flex-col gap-2">
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] rounded border border-border/50"
                title="PDF Preview"
              />
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline text-center"
              >
                Open PDF in new tab
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetupAttachments;
