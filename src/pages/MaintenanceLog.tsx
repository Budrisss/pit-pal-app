import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Wrench, Calendar, FileText, Trash2, Paperclip, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCars } from "@/contexts/CarsContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Navigation from "@/components/Navigation";

const SERVICE_PRESETS = [
  "Oil Change",
  "Brake Pads",
  "Brake Fluid",
  "Tire Rotation",
  "Alignment",
  "Coolant Flush",
  "Transmission Fluid",
  "Spark Plugs",
  "Air Filter",
  "Belt Replacement",
  "Custom",
];

interface MaintenanceRecord {
  id: string;
  service_type: string;
  service_date: string;
  mileage: number | null;
  notes: string | null;
  created_at: string;
  attachments: Attachment[];
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
}

const MaintenanceLog = () => {
  const { carId } = useParams<{ carId: string }>();
  const navigate = useNavigate();
  const { cars } = useCars();
  const { user } = useAuth();
  const { toast } = useToast();

  const car = cars.find((c) => c.id === carId);

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [serviceType, setServiceType] = useState("Oil Change");
  const [customType, setCustomType] = useState("");
  const [serviceDate, setServiceDate] = useState<Date>(new Date());
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    if (!user || !carId) return;
    setLoading(true);

    const { data: logs, error } = await (supabase as any)
      .from("maintenance_logs")
      .select("*")
      .eq("car_id", carId)
      .eq("user_id", user.id)
      .order("service_date", { ascending: false });

    if (error || !logs) {
      setLoading(false);
      return;
    }

    const logIds = logs.map((l: any) => l.id);
    let attachmentsMap: Record<string, Attachment[]> = {};

    if (logIds.length > 0) {
      const { data: attachments } = await (supabase as any)
        .from("maintenance_attachments")
        .select("*")
        .in("log_id", logIds);

      if (attachments) {
        for (const att of attachments) {
          if (!attachmentsMap[att.log_id]) attachmentsMap[att.log_id] = [];
          attachmentsMap[att.log_id].push(att);
        }
      }
    }

    setRecords(
      logs.map((l: any) => ({
        ...l,
        attachments: attachmentsMap[l.id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [user, carId]);

  const resetForm = () => {
    setServiceType("Oil Change");
    setCustomType("");
    setServiceDate(new Date());
    setMileage("");
    setNotes("");
    setFiles([]);
    setEditingRecord(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (record: MaintenanceRecord) => {
    const isPreset = SERVICE_PRESETS.includes(record.service_type);
    setServiceType(isPreset ? record.service_type : "Custom");
    setCustomType(isPreset ? "" : record.service_type);
    setServiceDate(new Date(record.service_date + "T00:00:00"));
    setMileage(record.mileage ? record.mileage.toString() : "");
    setNotes(record.notes || "");
    setFiles([]);
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !carId) return;
    const finalType = serviceType === "Custom" ? customType.trim() : serviceType;
    if (!finalType) {
      toast({ title: "Please enter a service type", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      service_type: finalType,
      service_date: format(serviceDate, "yyyy-MM-dd"),
      mileage: mileage ? parseInt(mileage) : null,
      notes: notes.trim() || null,
    };

    let logId: string;

    if (editingRecord) {
      // Update existing
      const { error } = await (supabase as any)
        .from("maintenance_logs")
        .update(payload)
        .eq("id", editingRecord.id)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "Failed to update record", variant: "destructive" });
        setSaving(false);
        return;
      }
      logId = editingRecord.id;
    } else {
      // Insert new
      const { data: log, error } = await (supabase as any)
        .from("maintenance_logs")
        .insert({ user_id: user.id, car_id: carId, ...payload })
        .select()
        .single();

      if (error || !log) {
        toast({ title: "Failed to save record", variant: "destructive" });
        setSaving(false);
        return;
      }
      logId = log.id;
    }

    // Upload new attachments
    for (const file of files) {
      const filePath = `${user.id}/${logId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("maintenance-attachments")
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("maintenance-attachments")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          await (supabase as any).from("maintenance_attachments").insert({
            log_id: logId,
            user_id: user.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type || null,
          });
        }
      }
    }

    toast({ title: editingRecord ? "Record updated" : "Service record added" });
    resetForm();
    setDialogOpen(false);
    setSaving(false);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await (supabase as any)
      .from("maintenance_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    setRecords((prev) => prev.filter((r) => r.id !== id));
    setDeleteId(null);
    toast({ title: "Record deleted" });
  };

  const isImage = (type: string | null) => type?.startsWith("image/");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/garage")}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Maintenance Log</h1>
            {car && <p className="text-sm text-muted-foreground truncate">{car.year} {car.make} {car.model}</p>}
          </div>
          <Button size="sm" className="rounded-full gap-1.5" onClick={openAddDialog}>
            <Plus size={16} />
            Add Record
          </Button>
        </div>

        {/* Records List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Wrench size={40} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No maintenance records yet</p>
            <p className="text-sm text-muted-foreground">Tap "Add Record" to log your first service</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
                <Card key={record.id} className="bg-card border-border cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : record.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">{record.service_type}</Badge>
                          {record.attachments.length > 0 && <Paperclip size={12} className="text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(record.service_date), "MMM d, yyyy")}
                          {record.mileage && ` · ${record.mileage.toLocaleString()} mi`}
                        </p>
                        {!isExpanded && record.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{record.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(record); }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(record.id); }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        {record.notes && <p className="text-sm text-foreground">{record.notes}</p>}
                        {record.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {record.attachments.map((att) => (
                              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block">
                                {isImage(att.file_type) ? (
                                  <img src={att.file_url} alt={att.file_name} className="size-16 rounded-lg object-cover border border-border" />
                                ) : (
                                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary text-xs text-foreground">
                                    <FileText size={14} />
                                    <span className="max-w-[100px] truncate">{att.file_name}</span>
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Service Record" : "Add Service Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Service Type</label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_PRESETS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {serviceType === "Custom" && (
                <Input placeholder="Enter custom service type" value={customType} onChange={(e) => setCustomType(e.target.value)} />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !serviceDate && "text-muted-foreground")}>
                    <Calendar size={16} className="mr-2" />
                    {serviceDate ? format(serviceDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={serviceDate} onSelect={(d) => d && setServiceDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mileage (optional)</label>
              <Input type="number" placeholder="e.g. 45000" value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes (optional)</label>
              <Textarea placeholder="Any details about this service..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {editingRecord ? "Add more attachments (optional)" : "Attachments (optional)"}
              </label>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={14} />
                {files.length > 0 ? `${files.length} file(s) selected` : "Add photos or PDFs"}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) setFiles(Array.from(e.target.files)); }} />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {files.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{f.name}</Badge>
                  ))}
                </div>
              )}
              {editingRecord && editingRecord.attachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Existing attachments:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editingRecord.attachments.map((att) => (
                      <Badge key={att.id} variant="outline" className="text-xs">{att.file_name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingRecord ? "Update Record" : "Save Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this service record and its attachments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && handleDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaintenanceLog;
