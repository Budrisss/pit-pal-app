import { useState, useEffect, useRef } from "react";
import { Wrench, Upload, Image, FileText, X, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleSetupForm } from "@/components/VehicleSetupForm";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SetupAttachment {
  id: string;
  setup_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

const Setups = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(true);
  const [attachments, setAttachments] = useState<SetupAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchAttachments();
  }, [user]);

  const fetchAttachments = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_attachments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setAttachments(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

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
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("setup-attachments")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("setup-attachments").getPublicUrl(filePath);

      await (supabase as any).from("setup_attachments").insert({
        setup_id: null,
        user_id: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
      });
    }

    setUploading(false);
    await fetchAttachments();
    toast({ title: "Uploaded", description: "Setup file(s) uploaded successfully" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (att: SetupAttachment) => {
    const urlParts = att.file_url.split("/setup-attachments/");
    if (urlParts[1]) {
      await supabase.storage.from("setup-attachments").remove([decodeURIComponent(urlParts[1])]);
    }
    await (supabase as any).from("setup_attachments").delete().eq("id", att.id);
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    toast({ title: "Deleted", description: "Attachment removed" });
  };

  const isImage = (type: string | null) => type?.startsWith("image/");

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="text-primary" />
              Vehicle Setups
            </h1>
            <p className="text-muted-foreground text-sm">Create and manage your chassis setups</p>
          </div>
        </div>

        {/* Upload Setup Files */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload size={20} className="text-primary" />
              Setup Sheets
            </CardTitle>
            <p className="text-muted-foreground text-xs">Upload images or PDFs of your setup sheets</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="setup-file-upload"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Image or PDF"}
              </Button>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                    {isImage(att.file_type) ? (
                      <img
                        src={att.file_url}
                        alt={att.file_name}
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => setPreviewUrl(att.file_url)}
                      />
                    ) : (
                      <div
                        className="w-full h-32 flex flex-col items-center justify-center cursor-pointer gap-2"
                        onClick={() => window.open(att.file_url, "_blank")}
                      >
                        <FileText size={32} className="text-primary" />
                        <span className="text-xs text-muted-foreground truncate max-w-[90%] px-2">{att.file_name}</span>
                      </div>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isImage(att.file_type) && (
                        <button
                          onClick={() => setPreviewUrl(att.file_url)}
                          className="bg-background/80 rounded-full p-1"
                        >
                          <Eye size={14} className="text-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(att)}
                        className="bg-destructive/80 rounded-full p-1"
                      >
                        <X size={14} className="text-destructive-foreground" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate px-2 py-1">{att.file_name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collapsible Chassis Setup Form */}
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Wrench size={16} className="text-primary" />
                Chassis Setup Form
              </span>
              {formOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <VehicleSetupForm />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-2">
          <DialogHeader>
            <DialogTitle>Setup Sheet</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Setup preview" className="w-full h-auto max-h-[75vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Setups;
