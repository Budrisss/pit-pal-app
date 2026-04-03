import { useState, useEffect } from "react";
import { Wrench, ChevronDown, ChevronUp, Upload, Car, Calendar, Clock, MapPin, Save, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([]);
  const [allAttachments, setAllAttachments] = useState<SetupAttachment[]>([]);
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // General setup sheet form state
  const [sheetName, setSheetName] = useState("");
  const [sheetCar, setSheetCar] = useState("");
  const [sheetEvent, setSheetEvent] = useState("");
  const [sheetSession, setSheetSession] = useState("");
  const [sheetFastestLap, setSheetFastestLap] = useState("");
  const [saving, setSaving] = useState(false);

  // Selector data
  const [cars, setCars] = useState<UserCar[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [resolvedTrack, setResolvedTrack] = useState("");

  useEffect(() => {
    if (user) {
      fetchSetups();
      fetchAttachments();
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
    if (data) setAllAttachments(data);
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

    toast({ title: "Setup saved", description: "Your setup sheet has been created" });
    setSheetName("");
    setSheetCar("");
    setSheetEvent("");
    setSheetSession("");
    setSheetFastestLap("");
    fetchSetups();
    fetchAttachments();
  };

  const handleDeleteSetup = async (setupId: string) => {
    if (!user) return;
    // Delete attachments first, then the setup record
    await (supabase as any)
      .from("setup_attachments")
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
      if (expandedSetup === setupId) setExpandedSetup(null);
    }
    setDeleteConfirmId(null);
  };

  const generalAttachments = allAttachments.filter((a) => !a.setup_id);
  const getSetupAttachments = (setupId: string) => allAttachments.filter((a) => a.setup_id === setupId);

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

        {/* General Upload with metadata */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload size={20} className="text-primary" />
              New Setup Sheet
            </CardTitle>
            <p className="text-muted-foreground text-xs">Upload images or PDFs and link to a car, event & session</p>
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

        {/* Saved Setups List */}
        {savedSetups.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Saved Setups</h2>
            {savedSetups.map((setup) => {
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
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(setup.id); }}
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete Setup
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

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
    </div>
  );
};

export default Setups;
