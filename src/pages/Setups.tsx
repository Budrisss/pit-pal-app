import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, ChevronDown, ChevronUp, Upload, Car, Calendar, Clock, MapPin, Save, Trash2, Pencil, ArrowLeft, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleSetupForm } from "@/components/VehicleSetupForm";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import SetupAttachments from "@/components/SetupAttachments";
import TireWearPhotos, { TirePhoto } from "@/components/TireWearPhotos";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SetupAttachment {
  id: string;
  setup_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

interface SavedSetup {
  id: string;
  setup_name: string | null;
  session_name: string | null;
  car_id: string | null;
  event_id: string | null;
  created_at: string;
  fastest_lap_time: string | null;
  notes_times: string | null;
}



interface UserCar {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
}

interface Event {
  id: string;
  name: string;
  date: string;
  track_id: string;
  address?: string;
  trackName?: string;
}

interface Session {
  id: string;
  name: string;
  type: string;
  event_id: string;
}

const Setups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([]);
  const [allAttachments, setAllAttachments] = useState<SetupAttachment[]>([]);
  const [allTirePhotos, setAllTirePhotos] = useState<TirePhoto[]>([]);
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingSetup, setEditingSetup] = useState<SavedSetup | null>(null);
  const [editName, setEditName] = useState("");
  const [editCar, setEditCar] = useState("");
  const [editEvent, setEditEvent] = useState("");
  const [editSession, setEditSession] = useState("");
  const [editFastestLap, setEditFastestLap] = useState("");
  const [editSessions, setEditSessions] = useState<Session[]>([]);
  const [editResolvedTrack, setEditResolvedTrack] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // General setup sheet form state
  const [sheetName, setSheetName] = useState("");
  const [sheetCar, setSheetCar] = useState("");
  const [sheetEvent, setSheetEvent] = useState("");
  const [sheetSession, setSheetSession] = useState("");
  const [sheetFastestLap, setSheetFastestLap] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selector data
  const [cars, setCars] = useState<UserCar[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [resolvedTrack, setResolvedTrack] = useState("");

  useEffect(() => {
    if (user) {
      fetchSetups();
      fetchAttachments();
      fetchTirePhotos();
      fetchCars();
      fetchUserEvents();
    }
  }, [user]);

  useEffect(() => {
    if (sheetEvent) {
      fetchSessions();
      // Resolve track name from event
      const evt = userEvents.find((e) => e.id === sheetEvent);
      setResolvedTrack(evt?.trackName || evt?.address || "");
    } else {
      setSessions([]);
      setSheetSession("");
      setResolvedTrack("");
    }
  }, [sheetEvent, userEvents]);

  const fetchCars = async () => {
    const { data } = await (supabase as any)
      .from("cars")
      .select("id, name, make, model, year")
      .order("name");
    if (data) setCars(data);
  };

  const fetchUserEvents = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("events")
      .select("id, name, date, track_id, address, track_name:tracks(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (data) {
      setUserEvents(data.map((row: any) => ({
        ...row,
        trackName: row.track_name?.name || row.address || "",
      })));
    }
  };

  const fetchSessions = async () => {
    const { data } = await (supabase as any)
      .from("sessions")
      .select("id, name, type, event_id")
      .eq("event_id", sheetEvent)
      .order("created_at");
    if (data) setSessions(data);
  };

  const fetchSetups = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_data")
      .select("id, setup_name, session_name, car_id, event_id, created_at, fastest_lap_time, notes_times")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setSavedSetups(data);
  };

  const fetchAttachments = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_attachments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      const resolved = await Promise.all(
        data.map(async (att: any) => {
          let storagePath = att.file_url;
          if (storagePath.includes("/setup-attachments/")) {
            storagePath = decodeURIComponent(storagePath.split("/setup-attachments/").pop()!);
          }
          const { data: signedData } = await supabase.storage
            .from("setup-attachments")
            .createSignedUrl(storagePath, 3600);
          return { ...att, file_url: signedData?.signedUrl || att.file_url };
        })
      );
      setAllAttachments(resolved);
    }
  };

  const fetchTirePhotos = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_tire_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      const resolved = await Promise.all(
        data.map(async (p: any) => {
          let storagePath = p.file_url;
          if (storagePath.includes("/setup-attachments/")) {
            storagePath = decodeURIComponent(storagePath.split("/setup-attachments/").pop()!);
          }
          const { data: signedData } = await supabase.storage
            .from("setup-attachments")
            .createSignedUrl(storagePath, 3600);
          return { ...p, file_url: signedData?.signedUrl || p.file_url };
        })
      );
      setAllTirePhotos(resolved);
    }
  };

  const handleSaveSetupSheet = async () => {
    if (!user || !sheetName.trim()) {
      toast({ title: "Setup name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const sessionObj = sessions.find((s) => s.id === sheetSession);

    const { data, error } = await (supabase as any)
      .from("setup_data")
      .insert({
        user_id: user.id,
        setup_name: sheetName.trim(),
        car_id: sheetCar || null,
        event_id: sheetEvent || null,
        session_id: sheetSession || null,
        session_name: sessionObj?.name || null,
        fastest_lap_time: sheetFastestLap.trim() || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Error saving setup", description: error.message, variant: "destructive" });
      return;
    }

    // Move any unlinked attachments to this new setup
    const unlinked = allAttachments.filter((a) => !a.setup_id);
    if (unlinked.length > 0 && data?.id) {
      for (const att of unlinked) {
        await (supabase as any)
          .from("setup_attachments")
          .update({ setup_id: data.id })
          .eq("id", att.id);
      }
    }

    // Link unlinked tire photos to this setup
    if (data?.id) {
      await (supabase as any)
        .from("setup_tire_photos")
        .update({ setup_id: data.id })
        .eq("user_id", user.id)
        .is("setup_id", null);
    }

    toast({ title: "Setup saved", description: "Your setup sheet has been created" });
    setSheetName("");
    setSheetCar("");
    setSheetEvent("");
    setSheetSession("");
    setSheetFastestLap("");
    fetchSetups();
    fetchAttachments();
    fetchTirePhotos();
  };

  const handleDeleteSetup = async (setupId: string) => {
    if (!user) return;
    // Delete attachments first, then the setup record
    await (supabase as any)
      .from("setup_attachments")
      .delete()
      .eq("setup_id", setupId)
      .eq("user_id", user.id);
    await (supabase as any)
      .from("setup_tire_photos")
      .delete()
      .eq("setup_id", setupId)
      .eq("user_id", user.id);
    
    const { error } = await (supabase as any)
      .from("setup_data")
      .delete()
      .eq("id", setupId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error deleting setup", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Setup deleted" });
      setSavedSetups((prev) => prev.filter((s) => s.id !== setupId));
      setAllAttachments((prev) => prev.filter((a) => a.setup_id !== setupId));
      setAllTirePhotos((prev) => prev.filter((p) => p.setup_id !== setupId));
      if (expandedSetup === setupId) setExpandedSetup(null);
    }
    setDeleteConfirmId(null);
  };

  const openEditDialog = (setup: SavedSetup) => {
    setEditingSetup(setup);
    setEditName(setup.setup_name || "");
    setEditCar(setup.car_id || "");
    setEditEvent(setup.event_id || "");
    setEditSession("");
    setEditFastestLap(setup.fastest_lap_time || "");
    setEditResolvedTrack("");
    // Fetch sessions for the setup's event
    if (setup.event_id) {
      (supabase as any)
        .from("sessions")
        .select("id, name, type, event_id")
        .eq("event_id", setup.event_id)
        .order("created_at")
        .then(({ data }: any) => {
          setEditSessions(data || []);
          // Try to find matching session by name
          const match = (data || []).find((s: Session) => s.name === setup.session_name);
          if (match) setEditSession(match.id);
        });
      const evt = userEvents.find((e) => e.id === setup.event_id);
      setEditResolvedTrack(evt?.trackName || evt?.address || "");
    }
  };

  useEffect(() => {
    if (editEvent && editingSetup) {
      (supabase as any)
        .from("sessions")
        .select("id, name, type, event_id")
        .eq("event_id", editEvent)
        .order("created_at")
        .then(({ data }: any) => {
          setEditSessions(data || []);
          if (editEvent !== editingSetup.event_id) setEditSession("");
        });
      const evt = userEvents.find((e) => e.id === editEvent);
      setEditResolvedTrack(evt?.trackName || evt?.address || "");
    } else if (!editEvent) {
      setEditSessions([]);
      setEditSession("");
      setEditResolvedTrack("");
    }
  }, [editEvent]);

  const handleUpdateSetup = async () => {
    if (!user || !editingSetup || !editName.trim()) {
      toast({ title: "Setup name is required", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    const sessionObj = editSessions.find((s) => s.id === editSession);
    const { error } = await (supabase as any)
      .from("setup_data")
      .update({
        setup_name: editName.trim(),
        car_id: editCar || null,
        event_id: editEvent || null,
        session_id: editSession || null,
        session_name: sessionObj?.name || null,
        fastest_lap_time: editFastestLap.trim() || null,
      })
      .eq("id", editingSetup.id)
      .eq("user_id", user.id);

    setEditSaving(false);
    if (error) {
      toast({ title: "Error updating setup", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Setup updated" });
      setEditingSetup(null);
      fetchSetups();
    }
  };

  const generalAttachments = allAttachments.filter((a) => !a.setup_id);
  const getSetupAttachments = (setupId: string) => allAttachments.filter((a) => a.setup_id === setupId);
  const generalTirePhotos = allTirePhotos.filter((p) => !p.setup_id);
  const getSetupTirePhotos = (setupId: string) => allTirePhotos.filter((p) => p.setup_id === setupId);

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-3">
            <Button variant="glass" size="icon" className="size-8" onClick={() => navigate('/garage')}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Wrench className="text-primary" />
                Vehicle Setups
              </h1>
              <p className="text-muted-foreground text-sm">Create and manage your chassis setups</p>
            </div>
          </div>
        </div>

        {/* Page intro */}
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="p-4 flex gap-3">
            <Info size={20} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground text-sm">Track Your Vehicle Setups</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Keep a complete history of every chassis configuration you run. Setups can be saved two ways — upload an existing setup sheet for safekeeping, or enter your numbers manually using our structured data collector. Use saved setups to compare changes session-to-session and dial in faster at every track.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* General Upload with metadata */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload size={20} className="text-primary" />
              New Setup Sheet
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload an existing setup sheet (PDF, image, or doc) for safekeeping and cataloging. Best for sheets you already have from your shop, crew chief, or chassis builder.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Setup Name */}
            <div className="space-y-2">
              <Label>Setup Name</Label>
              <Input
                placeholder="e.g., Dry Weather Setup"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
            </div>

            {/* Event & Car row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={sheetEvent} onValueChange={setSheetEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {userEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {event.name} - {new Date(event.date).toLocaleDateString()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Car</Label>
                <Select value={sheetCar} onValueChange={setSheetCar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select car" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        <div className="flex items-center gap-2">
                          <Car size={14} />
                          {car.name} {car.year && car.make && `(${car.year} ${car.make} ${car.model})`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Track (auto-resolved) */}
            {resolvedTrack && (
              <div className="space-y-2">
                <Label>Track / Venue</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/50">
                  <MapPin size={14} className="text-primary" />
                  {resolvedTrack}
                </div>
              </div>
            )}

            {/* Session & Fastest Lap row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={sheetSession} onValueChange={setSheetSession} disabled={!sheetEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder={sheetEvent ? "Select session" : "Select event first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {session.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fastest Lap</Label>
                <Input
                  placeholder="e.g., 1:23.456"
                  value={sheetFastestLap}
                  onChange={(e) => setSheetFastestLap(e.target.value)}
                />
              </div>
            </div>

            {/* File upload */}
            {user && (
              <SetupAttachments
                attachments={generalAttachments}
                setupId={null}
                userId={user.id}
                onChanged={fetchAttachments}
              />
            )}

            {/* Tire wear photos */}
            {user && (
              <div className="space-y-2">
                <Label>Tire Wear Photos</Label>
                <p className="text-xs text-muted-foreground">Capture wear pattern for each corner. Photos link to this setup when saved.</p>
                <TireWearPhotos
                  setupId={null}
                  userId={user.id}
                  photos={generalTirePhotos}
                  onChanged={fetchTirePhotos}
                />
              </div>
            )}

            {/* Save button */}
            <Button
              onClick={handleSaveSetupSheet}
              disabled={saving || !sheetName.trim()}
              className="w-full"
            >
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Setup Sheet"}
            </Button>
          </CardContent>
        </Card>

        {/* Collapsible Chassis Setup Form */}
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <p className="text-sm text-muted-foreground mb-2">
            Manually enter your setup data using our structured collector. Captures alignment, springs, shocks, sway bars, tire pressures, and per-corner tire wear photos — all searchable and comparable across sessions.
          </p>
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

        {/* Saved Setups List */}
        {savedSetups.length > 0 && (() => {
          const q = searchQuery.trim().toLowerCase();
          const filtered = q
            ? savedSetups.filter((setup) => {
                const car = cars.find((c) => c.id === setup.car_id);
                const evt = userEvents.find((e) => e.id === setup.event_id);
                const carText = [car?.name, car?.make, car?.model].filter(Boolean).join(" ").toLowerCase();
                const trackText = [evt?.trackName, evt?.address, evt?.name].filter(Boolean).join(" ").toLowerCase();
                return carText.includes(q) || trackText.includes(q);
              })
            : savedSetups;
          return (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">Saved Setups</h2>
              <div className="relative sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by car or track..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No setups match "{searchQuery}".</p>
            )}
            {filtered.map((setup) => {
              const isExpanded = expandedSetup === setup.id;
              const setupAtts = getSetupAttachments(setup.id);
              const setupCar = cars.find((c) => c.id === setup.car_id);
              const setupEvent = userEvents.find((e) => e.id === setup.event_id);
              return (
                <Card key={setup.id} className="border-border/50">
                  <CardHeader
                    className="pb-2 cursor-pointer"
                    onClick={() => setExpandedSetup(isExpanded ? null : setup.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wrench size={16} className="text-primary" />
                          {setup.setup_name || "Untitled Setup"}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {setup.session_name && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {setup.session_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {new Date(setup.created_at).toLocaleDateString()}
                          </span>
                          {setup.fastest_lap_time && (
                            <Badge variant="secondary" className="text-[10px]">
                              {setup.fastest_lap_time}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {setupAtts.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {setupAtts.length} file{setupAtts.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-3">
                      {/* Setup metadata */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {setupCar && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Car size={12} className="text-primary shrink-0" />
                            <span>{setupCar.name} {setupCar.year && setupCar.make ? `(${setupCar.year} ${setupCar.make} ${setupCar.model})` : ""}</span>
                          </div>
                        )}
                        {setupEvent && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar size={12} className="text-primary shrink-0" />
                            <span>{setupEvent.name} - {new Date(setupEvent.date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {(setupEvent?.trackName || setupEvent?.address) && (
                          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <MapPin size={12} className="text-primary shrink-0" />
                            <span>{setupEvent.trackName || setupEvent.address}</span>
                          </div>
                        )}
                        {setup.fastest_lap_time && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock size={12} className="text-primary shrink-0" />
                            <span>Fastest Lap: {setup.fastest_lap_time}</span>
                          </div>
                        )}
                      </div>
                      {setup.notes_times && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{setup.notes_times}</p>
                      )}
                      {user && (
                        <SetupAttachments
                          attachments={setupAtts}
                          setupId={setup.id}
                          userId={user.id}
                          onChanged={fetchAttachments}
                          compact
                        />
                      )}
                      {user && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">Tire Wear</p>
                          <TireWearPhotos
                            setupId={setup.id}
                            userId={user.id}
                            photos={getSetupTirePhotos(setup.id)}
                            onChanged={fetchTirePhotos}
                            compact
                          />
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(setup); }}
                        >
                          <Pencil size={14} className="mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(setup.id); }}
                        >
                          <Trash2 size={14} className="mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
          );
        })()}
      </div>

      <Navigation />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this setup and all its attached files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDeleteSetup(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingSetup} onOpenChange={(open) => !open && setEditingSetup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={20} className="text-primary" />
              Edit Setup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Setup Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g., Dry Weather Setup" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={editEvent} onValueChange={setEditEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {userEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {event.name} - {new Date(event.date).toLocaleDateString()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Car</Label>
                <Select value={editCar} onValueChange={setEditCar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select car" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        <div className="flex items-center gap-2">
                          <Car size={14} />
                          {car.name} {car.year && car.make && `(${car.year} ${car.make} ${car.model})`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editResolvedTrack && (
              <div className="space-y-2">
                <Label>Track / Venue</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/50">
                  <MapPin size={14} className="text-primary" />
                  {editResolvedTrack}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={editSession} onValueChange={setEditSession} disabled={!editEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder={editEvent ? "Select session" : "Select event first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {editSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {session.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fastest Lap</Label>
                <Input value={editFastestLap} onChange={(e) => setEditFastestLap(e.target.value)} placeholder="e.g., 1:23.456" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingSetup(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleUpdateSetup} disabled={editSaving || !editName.trim()} className="flex-1">
                <Save size={14} className="mr-2" />
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Setups;
