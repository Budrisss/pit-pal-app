import { useRef, useState, useEffect } from "react";
import { X, Camera, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type TireCorner = "LF" | "RF" | "LR" | "RR";

export interface TirePhoto {
  id: string;
  setup_id: string | null;
  user_id: string;
  corner: TireCorner;
  file_name: string;
  file_url: string; // signed URL or raw path
  file_type: string | null;
  created_at: string;
}

interface Props {
  setupId: string | null;
  userId: string;
  photos: TirePhoto[];
  onChanged: () => void;
  compact?: boolean;
}

const CORNERS: { key: TireCorner; label: string }[] = [
  { key: "LF", label: "Left Front" },
  { key: "RF", label: "Right Front" },
  { key: "LR", label: "Left Rear" },
  { key: "RR", label: "Right Rear" },
];

const getStoragePath = (fileUrl: string) => {
  if (fileUrl.includes("/object/sign/setup-attachments/")) {
    return decodeURIComponent(fileUrl.split("/object/sign/setup-attachments/").pop()!.split("?")[0]);
  }
  if (fileUrl.includes("/setup-attachments/")) {
    return decodeURIComponent(fileUrl.split("/setup-attachments/").pop()!.split("?")[0]);
  }
  return fileUrl;
};

const TireWearPhotos = ({ setupId, userId, photos, onChanged, compact }: Props) => {
  const { toast } = useToast();
  const [uploadingCorner, setUploadingCorner] = useState<TireCorner | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRefs = useRef<Record<TireCorner, HTMLInputElement | null>>({
    LF: null, RF: null, LR: null, RR: null,
  });

  const handleUpload = async (corner: TireCorner, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingCorner(corner);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Only images allowed", variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB per photo", variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const folder = setupId || "unlinked";
      const filePath = `${userId}/tire-wear/${folder}/${corner}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("setup-attachments")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      await (supabase as any).from("setup_tire_photos").insert({
        setup_id: setupId,
        user_id: userId,
        corner,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
      });
    }

    setUploadingCorner(null);
    onChanged();
    if (inputRefs.current[corner]) inputRefs.current[corner]!.value = "";
  };

  const handleDelete = async (photo: TirePhoto) => {
    const storagePath = getStoragePath(photo.file_url);
    if (storagePath) {
      await supabase.storage.from("setup-attachments").remove([storagePath]);
    }
    await (supabase as any).from("setup_tire_photos").delete().eq("id", photo.id);
    onChanged();
    toast({ title: "Photo removed" });
  };

  const openPreview = async (photo: TirePhoto) => {
    if (photo.file_url.startsWith("http")) {
      setPreviewUrl(photo.file_url);
      return;
    }
    const storagePath = getStoragePath(photo.file_url);
    const { data } = await supabase.storage
      .from("setup-attachments")
      .createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {CORNERS.map(({ key, label }) => {
          const cornerPhotos = photos.filter((p) => p.corner === key);
          return (
            <div key={key} className="rounded-lg border border-border/50 bg-muted/20 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{cornerPhotos.length} photo{cornerPhotos.length !== 1 ? "s" : ""}</span>
              </div>

              {cornerPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
                  {cornerPhotos.map((photo) => (
                    <div key={photo.id} className="relative group overflow-hidden rounded border border-border/50">
                      <img
                        src={photo.file_url}
                        alt={`${label} tire wear`}
                        className="h-16 w-full cursor-pointer object-cover"
                        onClick={() => openPreview(photo)}
                      />
                      <div className="absolute right-0.5 top-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); openPreview(photo); }}
                          className="rounded-full bg-background/80 p-0.5"
                        >
                          <Eye size={10} className="text-foreground" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                          className="rounded-full bg-destructive/80 p-0.5"
                        >
                          <X size={10} className="text-destructive-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={(el) => { inputRefs.current[key] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleUpload(key, e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => inputRefs.current[key]?.click()}
                disabled={uploadingCorner === key}
              >
                <Camera size={12} className="mr-1" />
                {uploadingCorner === key ? "Uploading..." : "Add photo"}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] p-2">
          <DialogHeader>
            <DialogTitle>Tire Wear</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Tire wear preview" className="h-auto max-h-[75vh] w-full rounded object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TireWearPhotos;
