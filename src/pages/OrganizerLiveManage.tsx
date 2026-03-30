import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addMinutes, parseISO, differenceInMilliseconds, isAfter, isBefore } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Radio, Clock, Megaphone, Send, Users, Plus, Trash2, X, ChevronDown, Flag, AlertTriangle, Pencil, Check } from "lucide-react";
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

interface EventFlag {
  id: string;
  flag_type: string;
  message: string | null;
  target_user_id: string | null;
  is_active: boolean;
  created_at: string;
  session_id: string | null;
}

interface EventRegistrationWithCar {
  user_id: string;
  user_name: string;
  car_number: number | null;
  registration_type_id: string;
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
  const [activeFlags, setActiveFlags] = useState<EventFlag[]>([]);
  const [flagMessage, setFlagMessage] = useState("");
  const [showBlackFlagDialog, setShowBlackFlagDialog] = useState(false);
  const [blackFlagTarget, setBlackFlagTarget] = useState<string>("all");
  const [blackFlagMessage, setBlackFlagMessage] = useState("");
  const [registrations, setRegistrations] = useState<EventRegistrationWithCar[]>([]);
  const [blackFlagSearch, setBlackFlagSearch] = useState("");
  const [showYellowFlagDialog, setShowYellowFlagDialog] = useState(false);
  const [yellowFlagTurns, setYellowFlagTurns] = useState("");
  const [yellowFlagMessage, setYellowFlagMessage] = useState("");
  const [showBlueFlagDialog, setShowBlueFlagDialog] = useState(false);
  const [blueFlagTarget, setBlueFlagTarget] = useState<string>("all");
  const [blueFlagMessage, setBlueFlagMessage] = useState("");
  const [blueFlagSearch, setBlueFlagSearch] = useState("");
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null);
  const [editingFlagMessage, setEditingFlagMessage] = useState("");
  const [flagHistory, setFlagHistory] = useState<EventFlag[]>([]);
  const [expandedHistorySession, setExpandedHistorySession] = useState<string | null>(null);

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
      const [eventRes, sessRes, regTypesRes, annRes, regsRes, flagsRes, flagHistoryRes] = await Promise.all([
        supabase.from("public_events").select("name, organizer_id, date").eq("id", eventId).single(),
        supabase.from("public_event_sessions").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("registration_types").select("id, name").eq("event_id", eventId),
        supabase.from("event_announcements").select("id, message, created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
        supabase.from("event_registrations").select("id, user_id, user_name, car_number, registration_type_id").eq("event_id", eventId),
        supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", true),
        supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", false).not("session_id", "is", null).order("created_at", { ascending: true }),
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
      setRegistrations((regsRes.data as EventRegistrationWithCar[]) || []);
      setActiveFlags((flagsRes.data as EventFlag[]) || []);
      setFlagHistory((flagHistoryRes.data as EventFlag[]) || []);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_flags", filter: `event_id=eq.${eventId}` },
        () => {
          supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", true)
            .then(({ data }) => { if (data) setActiveFlags(data as EventFlag[]); });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

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

  const handleDeleteAnnouncement = async (id: string) => {
    await supabase.from("event_announcements").delete().eq("id", id);
  };

  const handleSendFlag = async (flagType: string) => {
    if (!eventId || !organizerProfileId) return;
    // Deactivate all existing flags (except local yellows and blue flags which are managed separately)
    await supabase.from("event_flags").update({ is_active: false }).eq("event_id", eventId).eq("is_active", true).neq("flag_type", "yellow_turn").neq("flag_type", "blue");
    // Insert new flag
    const { error } = await supabase.from("event_flags").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      flag_type: flagType,
      message: flagMessage.trim() || null,
      is_active: true,
      session_id: activeSessionIdRef.current,
    });
    if (error) {
      toast({ title: "Failed to send flag", variant: "destructive" });
    } else {
      setFlagMessage("");
      toast({ title: `${flagType.toUpperCase()} flag sent!` });
    }
  };

  const handleSendYellowByTurn = async () => {
    if (!eventId || !organizerProfileId || !yellowFlagTurns.trim()) return;
    const turnMsg = `Turn ${yellowFlagTurns.trim()}`;
    const fullMessage = [turnMsg, yellowFlagMessage.trim()].filter(Boolean).join(" — ");
    const { error } = await supabase.from("event_flags").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      flag_type: "yellow_turn",
      message: fullMessage,
      is_active: true,
      session_id: activeSessionIdRef.current,
    });
    if (error) {
      toast({ title: "Failed to send yellow flag", variant: "destructive" });
    } else {
      toast({ title: `⚠️ Yellow flag sent for Turn ${yellowFlagTurns.trim()}` });
      setShowYellowFlagDialog(false);
      setYellowFlagTurns("");
      setYellowFlagMessage("");
    }
  };

  const handleSendBlueFlag = async () => {
    if (!eventId || !organizerProfileId) return;
    const targetUserId = blueFlagTarget === "all" ? null : blueFlagTarget;
    const reg = registrations.find(r => r.user_id === blueFlagTarget);
    const carLabel = reg?.car_number ? `Car #${reg.car_number}` : "";
    const fullMessage = [carLabel, blueFlagMessage.trim()].filter(Boolean).join(" — ") || "Faster traffic approaching";
    const { error } = await supabase.from("event_flags").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      flag_type: "blue",
      message: fullMessage,
      target_user_id: targetUserId,
      is_active: true,
      session_id: activeSessionIdRef.current,
    });
    if (error) {
      toast({ title: "Failed to send blue flag", variant: "destructive" });
    } else {
      toast({ title: `🔵 Blue flag sent!` });
      setShowBlueFlagDialog(false);
      setBlueFlagTarget("all");
      setBlueFlagMessage("");
      setBlueFlagSearch("");
    }
  };

  const handleClearSingleFlag = async (flagId: string) => {
    const flag = activeFlags.find(f => f.id === flagId);
    await supabase.from("event_flags").update({ is_active: false }).eq("id", flagId);
    
    // If clearing a global caution flag (yellow, red) during an active session, auto-restore green
    const globalCautionTypes = ["yellow", "red"];
    const hasActiveSession = sessionStates.some(s => s.state === "active");
    if (flag && globalCautionTypes.includes(flag.flag_type) && hasActiveSession && eventId && organizerProfileId) {
      const remainingGlobal = activeFlags.filter(f => f.id !== flagId && !["yellow_turn", "blue"].includes(f.flag_type) && !(f.flag_type === "black" && f.target_user_id));
      if (remainingGlobal.length === 0) {
        await supabase.from("event_flags").insert({
          event_id: eventId,
          organizer_id: organizerProfileId,
          flag_type: "green",
          message: null,
          is_active: true,
          session_id: activeSessionIdRef.current,
        });
        toast({ title: "🟢 Green flag restored — caution cleared" });
        return;
      }
    }
    toast({ title: "Flag cleared" });
  };

  const handleUpdateFlagMessage = async (flagId: string, message: string) => {
    await supabase.from("event_flags").update({ message: message.trim() || null }).eq("id", flagId);
    setEditingFlagId(null);
    setEditingFlagMessage("");
    toast({ title: "Flag message updated" });
  };

  const handleSendBlackFlag = async () => {
    if (!eventId || !organizerProfileId) return;
    const targetUserId = blackFlagTarget === "all" ? null : blackFlagTarget;
    // Only deactivate global flags if this is a global (all drivers) black flag
    if (!targetUserId) {
      await supabase
        .from("event_flags")
        .update({ is_active: false })
        .eq("event_id", eventId)
        .eq("is_active", true)
        .neq("flag_type", "yellow_turn")
        .neq("flag_type", "blue");
    }
    const targetReg = registrations.find(r => r.user_id === targetUserId);
    const messagePrefix = targetReg?.car_number ? `Car #${targetReg.car_number}` : null;
    const fullMessage = [messagePrefix, blackFlagMessage.trim()].filter(Boolean).join(" — ") || null;
    const { error } = await supabase.from("event_flags").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      flag_type: "black",
      message: fullMessage,
      target_user_id: targetUserId,
      is_active: true,
    });
    if (error) {
      toast({ title: "Failed to send black flag", variant: "destructive" });
    } else {
      toast({ title: targetReg?.car_number ? `🏴 Black flag sent to Car #${targetReg.car_number}` : "🏴 Black flag sent to all drivers" });
      setShowBlackFlagDialog(false);
      setBlackFlagTarget("all");
      setBlackFlagMessage("");
      setBlackFlagSearch("");
    }
  };

  const handleClearFlags = async () => {
    if (!eventId) return;
    await supabase.from("event_flags").update({ is_active: false }).eq("event_id", eventId).eq("is_active", true);
    toast({ title: "All flags cleared" });
  };

  const getRunGroupName = (regTypeId: string | null) => {
    if (!regTypeId) return "All groups";
    return registrationTypes.find((rt) => rt.id === regTypeId)?.name || "Unknown";
  };

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

  // Auto-expire blue flags after 10 seconds
  const BLUE_FLAG_TTL_MS = 10_000;
  const [, setBlueFlagTick] = useState(0);
  useEffect(() => {
    const blueFlags = activeFlags.filter(f => f.flag_type === "blue");
    if (blueFlags.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const f of blueFlags) {
      const age = Date.now() - new Date(f.created_at).getTime();
      const remaining = BLUE_FLAG_TTL_MS - age;
      if (remaining <= 0) {
        supabase.from("event_flags").update({ is_active: false }).eq("id", f.id).then(() => {});
      } else {
        timers.push(setTimeout(() => {
          supabase.from("event_flags").update({ is_active: false }).eq("id", f.id).then(() => {});
          setBlueFlagTick(t => t + 1);
        }, remaining));
      }
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [activeFlags]);

  const isBlueExpired = (f: EventFlag) => f.flag_type === "blue" && (Date.now() - new Date(f.created_at).getTime()) >= BLUE_FLAG_TTL_MS;
  const isLocalCaution = (f: EventFlag) => f.flag_type === "yellow_turn" || (f.flag_type === "blue" && !isBlueExpired(f)) || (f.flag_type === "black" && f.target_user_id);

  const activeSession = sessionStates.find((s) => s.state === "active");
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSession?.id || null;

  // Auto-send checkered flag when a session ends
  const prevActiveSessionId = useRef<string | null>(null);
  useEffect(() => {
    const currentActiveId = activeSession?.id || null;
    const prevId = prevActiveSessionId.current;

    // Session just started (no prev active → now active): auto-send green flag
    if (!prevId && currentActiveId && eventId && organizerProfileId) {
      const autoGreen = async () => {
        const hasGreen = activeFlags.some(f => f.flag_type === "green" && f.is_active);
        if (hasGreen) return;
        await supabase
          .from("event_flags")
          .update({ is_active: false })
          .eq("event_id", eventId)
          .eq("is_active", true)
          .neq("flag_type", "yellow_turn")
          .neq("flag_type", "blue");
        await supabase.from("event_flags").insert({
          event_id: eventId,
          organizer_id: organizerProfileId,
          flag_type: "green",
          message: null,
          is_active: true,
        });
        toast({ title: "🟢 Green flag auto-sent — session started" });
      };
      autoGreen();
    }

    // Session just ended (had prev active → now none): auto-send checkered flag
    if (prevId && !currentActiveId && eventId && organizerProfileId) {
      const autoCheckered = async () => {
        const hasCheckered = activeFlags.some(f => f.flag_type === "checkered" && f.is_active);
        if (hasCheckered) return;
        await supabase
          .from("event_flags")
          .update({ is_active: false })
          .eq("event_id", eventId)
          .eq("is_active", true)
          .neq("flag_type", "yellow_turn")
          .neq("flag_type", "blue");
        await supabase.from("event_flags").insert({
          event_id: eventId,
          organizer_id: organizerProfileId,
          flag_type: "checkered",
          message: "Session complete",
          is_active: true,
        });
        toast({ title: "🏁 Checkered flag auto-sent — session ended" });
      };
      autoCheckered();
    }

    prevActiveSessionId.current = currentActiveId;
  }, [activeSession?.id, eventId, organizerProfileId]);
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
    const isBufferZone = diffMs <= 5 * 60 * 1000;
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
            className={`rounded-xl border backdrop-blur-sm p-3 sm:p-4 mb-4 ${
              nextCountdown.isBufferZone
                ? "border-destructive/50 bg-destructive/10"
                : "border-orange-500/40 bg-orange-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Next Session</p>
                <p className="text-sm font-bold text-foreground">{nextCountdown.sessionName}</p>
                <p className="text-xs text-muted-foreground">{nextCountdown.runGroup}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl sm:text-3xl font-mono font-bold ${
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

        {/* Flag Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Flag size={16} className="text-primary" /> Flag Control
          </h2>
          <div className="space-y-3 mb-3">
              {activeFlags.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Active Flags</span>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleClearFlags}>
                    Clear All
                  </Button>
                </div>
              )}

              {/* Track Status — Global flags */}
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">🏁 Track Status</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Replaces previous</Badge>
                </div>
                {activeFlags.filter(f => !isLocalCaution(f) && !isBlueExpired(f)).length > 0 ? (
                  <div className="space-y-1.5">
                    {activeFlags.filter(f => !isLocalCaution(f) && !isBlueExpired(f)).map(f => (
                      <div key={f.id} className="bg-background/60 rounded-md px-3 py-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {f.flag_type === "green" ? "🟢" : f.flag_type === "yellow" ? "⚠️" : f.flag_type === "red" ? "🔴" : f.flag_type === "black" ? "🏴" : f.flag_type === "white" ? "🏳️" : "🏁"}
                            </span>
                            <span className="text-xs font-medium">{f.flag_type.toUpperCase()}</span>
                            {editingFlagId !== f.id && f.message && <span className="text-xs text-muted-foreground">— {f.message}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {editingFlagId === f.id ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleUpdateFlagMessage(f.id, editingFlagMessage)}>
                                  <Check size={12} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => { setEditingFlagId(null); setEditingFlagMessage(""); }}>
                                  <X size={12} />
                                </Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setEditingFlagId(f.id); setEditingFlagMessage(f.message || ""); }}>
                                <Pencil size={12} />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleClearSingleFlag(f.id)}>
                              <X size={12} />
                            </Button>
                          </div>
                        </div>
                        {editingFlagId === f.id && (
                          <Input
                            value={editingFlagMessage}
                            onChange={(e) => setEditingFlagMessage(e.target.value)}
                            placeholder="Add a message..."
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateFlagMessage(f.id, editingFlagMessage); if (e.key === "Escape") { setEditingFlagId(null); setEditingFlagMessage(""); } }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No global flag active</p>
                )}
              </div>

              {/* Local Cautions — Stackable flags */}
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">⚠️ Local Cautions</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/50 text-warning">Stacks</Badge>
                  </div>
                  {activeFlags.filter(isLocalCaution).length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground hover:text-destructive" onClick={async () => {
                      if (!eventId) return;
                      const localFlags = activeFlags.filter(isLocalCaution);
                      for (const f of localFlags) {
                        await supabase.from("event_flags").update({ is_active: false }).eq("id", f.id);
                      }
                    }}>
                      Clear Local
                    </Button>
                  )}
                </div>
                {activeFlags.filter(isLocalCaution).length > 0 ? (
                  <div className="space-y-1.5">
                    {activeFlags.filter(f => f.flag_type === "yellow_turn").length > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md px-3 py-2 space-y-1.5">
                        <p className="text-[10px] text-yellow-600 dark:text-yellow-400 uppercase tracking-wider font-bold">⚠️ Local Yellow Flags</p>
                        {activeFlags.filter(f => f.flag_type === "yellow_turn").map(f => (
                          <div key={f.id} className="flex items-center justify-between">
                            <span className="text-xs font-medium">{f.message}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleClearSingleFlag(f.id)}>
                              <X size={10} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeFlags.filter(f => f.flag_type === "blue" && !isBlueExpired(f)).length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-md px-3 py-2 space-y-1.5">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">🔵 Blue Flags</p>
                        {activeFlags.filter(f => f.flag_type === "blue" && !isBlueExpired(f)).map(f => (
                          <div key={f.id} className="flex items-center justify-between">
                            <span className="text-xs font-medium">{f.message}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleClearSingleFlag(f.id)}>
                              <X size={10} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeFlags.filter(f => f.flag_type === "black" && f.target_user_id).length > 0 && (
                      <div className="bg-gray-900/10 border border-gray-500/30 rounded-md px-3 py-2 space-y-1.5">
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold">🏴 Targeted Black Flags</p>
                        {activeFlags.filter(f => f.flag_type === "black" && f.target_user_id).map(f => (
                          <div key={f.id} className="flex items-center justify-between">
                            <span className="text-xs font-medium">{f.message || "Black flag"}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleClearSingleFlag(f.id)}>
                              <X size={10} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No local cautions active</p>
                )}
              </div>
            </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-10" onClick={() => handleSendFlag("green")}>
              🟢 Green
            </Button>
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs h-10" onClick={() => setShowYellowFlagDialog(true)}>
              ⚠️ Yellow
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10" onClick={() => setShowBlueFlagDialog(true)}>
              🔵 Blue
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs h-10" onClick={() => handleSendFlag("red")}>
              🔴 Red
            </Button>
            <Button size="sm" className="bg-gray-900 hover:bg-black text-white text-xs h-10 border border-white/20" onClick={() => setShowBlackFlagDialog(true)}>
              🏴 Black
            </Button>
            <Button size="sm" className="bg-white hover:bg-gray-100 text-black text-xs h-10 border" onClick={() => handleSendFlag("white")}>
              🏳️ White
            </Button>
            <Button size="sm" className="bg-gray-800 hover:bg-gray-900 text-white text-xs h-10 border border-white/20" onClick={() => handleSendFlag("checkered")}>
              🏁 Finish
            </Button>
          </div>
          <Input
            value={flagMessage}
            onChange={(e) => setFlagMessage(e.target.value)}
            placeholder="Optional message for global flags"
            className="text-sm"
          />
        </motion.div>

        <Separator className="mb-6" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
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

        <Separator className="mb-6" />

        {/* Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                    )}
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

      {/* Black Flag Dialog */}
      <Dialog open={showBlackFlagDialog} onOpenChange={setShowBlackFlagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🏴 Send Black Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Driver</Label>
              <Input
                value={blackFlagSearch}
                onChange={e => setBlackFlagSearch(e.target.value)}
                placeholder="Search by car # or name..."
                className="text-sm"
              />
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                <div
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${blackFlagTarget === "all" ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                  onClick={() => setBlackFlagTarget("all")}
                >
                  <p className="text-sm font-medium">All Drivers</p>
                  <p className="text-[10px] text-muted-foreground">Global black flag</p>
                </div>
                {registrations
                  .filter(r => r.car_number != null)
                  .filter(r => {
                    if (!blackFlagSearch.trim()) return true;
                    const q = blackFlagSearch.toLowerCase();
                    return r.car_number?.toString().includes(q) || r.user_name.toLowerCase().includes(q);
                  })
                  .sort((a, b) => (a.car_number || 0) - (b.car_number || 0))
                  .map(r => (
                    <div
                      key={r.user_id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${blackFlagTarget === r.user_id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                      onClick={() => setBlackFlagTarget(r.user_id)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">#{r.car_number} — {r.user_name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {registrationTypes.find(rt => rt.id === r.registration_type_id)?.name || "—"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Message (optional)</Label>
              <Input
                value={blackFlagMessage}
                onChange={e => setBlackFlagMessage(e.target.value)}
                placeholder="e.g. Report to pit lane"
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleSendBlackFlag}
              className="w-full bg-gray-900 hover:bg-black text-white"
            >
              🏴 Send Black Flag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Yellow Flag by Turn Dialog */}
      <Dialog open={showYellowFlagDialog} onOpenChange={setShowYellowFlagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">⚠️ Yellow Flag by Turn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Turn Number(s)</Label>
              <Input
                value={yellowFlagTurns}
                onChange={e => setYellowFlagTurns(e.target.value)}
                placeholder="e.g. 3, 5-6, 12"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">This flag will show alongside the current track flag (e.g. green stays visible).</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Message (optional)</Label>
              <Input
                value={yellowFlagMessage}
                onChange={e => setYellowFlagMessage(e.target.value)}
                placeholder="e.g. Debris on track, Car off in gravel"
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendYellowByTurn}
                disabled={!yellowFlagTurns.trim()}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                ⚠️ Send Yellow Flag
              </Button>
              <Button
                variant="outline"
                onClick={() => { handleSendFlag("yellow"); setShowYellowFlagDialog(false); }}
                className="flex-1"
              >
                Full Course Yellow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blue Flag Dialog */}
      <Dialog open={showBlueFlagDialog} onOpenChange={setShowBlueFlagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🔵 Blue Flag — Faster Traffic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Driver (optional)</Label>
              <Input
                value={blueFlagSearch}
                onChange={e => setBlueFlagSearch(e.target.value)}
                placeholder="Search by name or car #"
                className="text-sm mb-2"
              />
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                <div
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${blueFlagTarget === "all" ? "bg-blue-500/20 border border-blue-500/40" : "hover:bg-muted/50"}`}
                  onClick={() => setBlueFlagTarget("all")}
                >
                  <span className="font-medium">All Drivers</span>
                </div>
                {registrations
                  .filter(r => {
                    if (!blueFlagSearch) return true;
                    const s = blueFlagSearch.toLowerCase();
                    return r.user_name.toLowerCase().includes(s) || (r.car_number?.toString() || "").includes(s);
                  })
                  .map(r => (
                    <div
                      key={r.user_id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${blueFlagTarget === r.user_id ? "bg-blue-500/20 border border-blue-500/40" : "hover:bg-muted/50"}`}
                      onClick={() => setBlueFlagTarget(r.user_id)}
                    >
                      {r.car_number && <Badge variant="outline" className="font-mono text-[10px]">#{r.car_number}</Badge>}
                      <span>{r.user_name}</span>
                    </div>
                  ))
                }
              </div>
              <p className="text-[10px] text-muted-foreground">Blue flag indicates faster traffic approaching. Shown as a banner alongside the current track flag.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Message (optional)</Label>
              <Input
                value={blueFlagMessage}
                onChange={e => setBlueFlagMessage(e.target.value)}
                placeholder="e.g. Faster car approaching, yield on straight"
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleSendBlueFlag}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              🔵 Send Blue Flag
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default OrganizerLiveManage;
