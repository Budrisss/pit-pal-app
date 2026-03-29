import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addMinutes, parseISO, differenceInMilliseconds, isAfter, isBefore } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Radio, Clock, Megaphone, Send, Users, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";

interface EventSession {
  id?: string;
  registration_type_id: string | null;
  name: string;
  start_time: string;
  duration_minutes: number | null;
  sort_order: number;
}

interface RegistrationType {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  message: string;
  created_at: string;
}

const OrganizerLiveManage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizerProfileId } = useOrganizerMode();
  const { toast } = useToast();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [registrationTypes, setRegistrationTypes] = useState<RegistrationType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [eventRes, sessRes, regTypesRes, annRes, regsRes] = await Promise.all([
        supabase.from("public_events").select("name, organizer_id, date").eq("id", eventId).single(),
        supabase.from("public_event_sessions").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("registration_types").select("id, name").eq("event_id", eventId),
        supabase.from("event_announcements").select("id, message, created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
        supabase.from("event_registrations").select("id").eq("event_id", eventId),
      ]);

      if (eventRes.data) {
        setEventName(eventRes.data.name);
        setEventDate(eventRes.data.date);
      }
      setSessions(
        (sessRes.data || []).map((s: any) => ({
          id: s.id,
          registration_type_id: s.registration_type_id,
          name: s.name,
          start_time: s.start_time || "",
          duration_minutes: s.duration_minutes,
          sort_order: s.sort_order,
        }))
      );
      setRegistrationTypes((regTypesRes.data as RegistrationType[]) || []);
      setAnnouncements((annRes.data as Announcement[]) || []);
      setTotalRegistrations(regsRes.data?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`live-manage-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_event_sessions", filter: `event_id=eq.${eventId}` },
        () => {
          // Refetch sessions on any change
          supabase
            .from("public_event_sessions")
            .select("*")
            .eq("event_id", eventId)
            .order("sort_order")
            .then(({ data }) => {
              if (data) {
                setSessions(
                  data.map((s: any) => ({
                    id: s.id,
                    registration_type_id: s.registration_type_id,
                    name: s.name,
                    start_time: s.start_time || "",
                    duration_minutes: s.duration_minutes,
                    sort_order: s.sort_order,
                  }))
                );
              }
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_announcements", filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from("event_announcements")
            .select("id, message, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false })
            .then(({ data }) => {
              if (data) setAnnouncements(data as Announcement[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Update a session field
  const handleUpdateSession = async (sessionId: string, field: string, value: any) => {
    const { error } = await supabase
      .from("public_event_sessions")
      .update({ [field]: value })
      .eq("id", sessionId);
    if (error) {
      toast({ title: "Failed to update session", variant: "destructive" });
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, [field]: value } : s))
      );
    }
  };

  // Add a new session
  const handleAddSession = async () => {
    if (!eventId) return;
    const { error } = await supabase.from("public_event_sessions").insert({
      event_id: eventId,
      name: `Session ${sessions.length + 1}`,
      sort_order: sessions.length,
    });
    if (error) {
      toast({ title: "Failed to add session", variant: "destructive" });
    } else {
      toast({ title: "Session added" });
    }
  };

  // Delete a session
  const handleDeleteSession = async () => {
    if (!deletingSessionId) return;
    const { error } = await supabase
      .from("public_event_sessions")
      .delete()
      .eq("id", deletingSessionId);
    if (error) {
      toast({ title: "Failed to delete session", variant: "destructive" });
    } else {
      toast({ title: "Session deleted" });
    }
    setDeletingSessionId(null);
  };

  // Post announcement
  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim() || !eventId || !organizerProfileId) return;
    setPostingAnnouncement(true);
    const { error } = await supabase.from("event_announcements").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      message: newAnnouncement.trim(),
    });
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } else {
      setNewAnnouncement("");
      toast({ title: "Announcement posted!" });
    }
    setPostingAnnouncement(false);
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (id: string) => {
    await supabase.from("event_announcements").delete().eq("id", id);
  };

  const getRunGroupName = (regTypeId: string | null) => {
    if (!regTypeId) return "All groups";
    return registrationTypes.find((rt) => rt.id === regTypeId)?.name || "Unknown";
  };

  // Session state calculation
  const sessionStates = useMemo(() => {
    if (!eventDate) return [];
    const now = currentTime;
    const evDate = parseISO(eventDate);
    return sessions.map((s) => {
      if (!s.start_time || !s.duration_minutes) return { ...s, state: "upcoming" as const };
      const [h, m] = s.start_time.split(":").map(Number);
      const start = new Date(evDate);
      start.setHours(h, m, 0, 0);
      const end = addMinutes(start, s.duration_minutes);
      if (isAfter(now, end)) return { ...s, state: "completed" as const };
      if (isAfter(now, start) && isBefore(now, end)) return { ...s, state: "active" as const };
      return { ...s, state: "upcoming" as const };
    });
  }, [sessions, eventDate, currentTime]);

  const activeSession = sessionStates.find((s) => s.state === "active");
  const activeRemaining = useMemo(() => {
    if (!activeSession?.start_time || !activeSession?.duration_minutes || !eventDate) return null;
    const evDate = parseISO(eventDate);
    const [h, m] = activeSession.start_time.split(":").map(Number);
    const start = new Date(evDate);
    start.setHours(h, m, 0, 0);
    const end = addMinutes(start, activeSession.duration_minutes);
    const diffMs = differenceInMilliseconds(end, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [activeSession, eventDate, currentTime]);

  const nextCountdown = useMemo(() => {
    if (!eventDate) return null;
    const evDate = parseISO(eventDate);
    const upcoming = sessionStates
      .filter((s) => s.state === "upcoming" && s.start_time)
      .sort((a, b) => {
        const [ah, am] = a.start_time.split(":").map(Number);
        const [bh, bm] = b.start_time.split(":").map(Number);
        return ah * 60 + am - (bh * 60 + bm);
      });
    if (upcoming.length === 0) return null;
    const next = upcoming[0];
    const [h, m] = next.start_time.split(":").map(Number);
    const start = new Date(evDate);
    start.setHours(h, m, 0, 0);
    const diffMs = differenceInMilliseconds(start, currentTime);
    if (diffMs <= 0) return null;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    const isBufferZone = diffMs <= 5 * 60 * 1000; // 5 minutes
    return { hours: hrs, minutes: mins, seconds: secs, isBufferZone, sessionName: next.name, runGroup: getRunGroupName(next.registration_type_id) };
  }, [sessionStates, eventDate, currentTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      <DesktopNavigation />

      <div className="pt-0 lg:pt-20 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/event-organizer")}
            className="shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-bold truncate">{eventName}</h1>
            </div>
            <p className="text-sm text-muted-foreground">Live Management</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-mono font-bold text-primary">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <Badge variant="secondary" className="text-xs">
              <Users size={10} className="mr-1" />
              {totalRegistrations} registered
            </Badge>
          </div>
        </motion.div>

        {/* Active Session Banner */}
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-green-500/40 bg-green-500/10 backdrop-blur-sm p-5 sm:p-6 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-lg font-bold text-foreground">{activeSession.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getRunGroupName(activeSession.registration_type_id)} • Started at {activeSession.start_time}
                  </p>
                </div>
              </div>
              {activeRemaining && (
                <div className="text-right">
                  <p className="text-4xl sm:text-5xl font-mono font-bold text-green-500">
                    {activeRemaining.minutes}:{activeRemaining.seconds.toString().padStart(2, "0")}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">remaining</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeSession && nextCountdown && (
          <div className="flex items-center gap-3 my-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <div className="flex items-center gap-1.5 text-orange-500">
              <ChevronDown size={14} className="animate-bounce" />
              <span className="text-[10px] uppercase tracking-widest font-semibold">up next</span>
              <ChevronDown size={14} className="animate-bounce" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
          </div>
        )}

        {/* Next Session Countdown */}
        {nextCountdown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border-2 backdrop-blur-sm p-5 sm:p-6 mb-4 ${
              nextCountdown.isBufferZone
                ? "border-destructive/50 bg-destructive/10"
                : "border-orange-500/40 bg-orange-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Session</p>
                <p className="text-lg font-bold text-foreground">{nextCountdown.sessionName}</p>
                <p className="text-sm text-muted-foreground">{nextCountdown.runGroup}</p>
              </div>
              <div className="text-right">
                <p className={`text-4xl sm:text-5xl font-mono font-bold ${
                  nextCountdown.isBufferZone ? "text-destructive animate-pulse" : "text-orange-500"
                }`}>
                  {nextCountdown.hours > 0 && `${nextCountdown.hours}:`}
                  {nextCountdown.minutes.toString().padStart(2, "0")}:{nextCountdown.seconds.toString().padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">until start</p>
              </div>
            </div>
          </motion.div>
        )}

        {!nextCountdown && sessions.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 mb-4 text-center">
            <p className="text-sm text-muted-foreground">🏁 No more sessions today</p>
          </div>
        )}

        {/* Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Schedule
            </h2>
            <Button variant="outline" size="sm" onClick={handleAddSession}>
              <Plus size={14} className="mr-1" /> Add Session
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Changes are pushed to participants in real-time.
          </p>

          {sessions.length === 0 ? (
            <Card className="bg-card/60 border-border">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No sessions yet. Add one to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card key={s.id} className="bg-card/80 border-border">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={s.name}
                            onChange={(e) =>
                              handleUpdateSession(s.id!, "name", e.target.value)
                            }
                            className="h-8 text-sm font-medium"
                          />
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {getRunGroupName(s.registration_type_id)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Start Time</Label>
                            <Input
                              type="time"
                              value={s.start_time || ""}
                              onChange={(e) =>
                                handleUpdateSession(s.id!, "start_time", e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Duration (min)</Label>
                            <Input
                              type="number"
                              value={s.duration_minutes ?? ""}
                              onChange={(e) =>
                                handleUpdateSession(
                                  s.id!,
                                  "duration_minutes",
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Run Group</Label>
                            <Select
                              value={s.registration_type_id || "none"}
                              onValueChange={(v) =>
                                handleUpdateSession(
                                  s.id!,
                                  "registration_type_id",
                                  v === "none" ? null : v
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">All groups</SelectItem>
                                {registrationTypes.map((rt) => (
                                  <SelectItem key={rt.id} value={rt.id}>
                                    {rt.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingSessionId(s.id!)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        <Separator className="mb-6" />

        {/* Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Megaphone size={16} className="text-primary" /> Announcements
          </h2>
          <div className="flex gap-2 mb-4">
            <Textarea
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              placeholder="Post an update to participants..."
              className="min-h-[60px] text-sm"
              rows={2}
            />
            <Button
              onClick={handlePostAnnouncement}
              disabled={!newAnnouncement.trim() || postingAnnouncement}
              size="icon"
              className="shrink-0 self-end h-10 w-10"
            >
              <Send size={16} />
            </Button>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No announcements yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="border border-border rounded-lg p-3 bg-muted/20 relative group"
                >
                  <p className="text-sm pr-6">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteAnnouncement(a.id)}
                  >
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Delete Session Confirmation */}
      <AlertDialog
        open={!!deletingSessionId}
        onOpenChange={(open) => {
          if (!open) setDeletingSessionId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will remove the session for all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Navigation />
    </div>
  );
};

export default OrganizerLiveManage;
