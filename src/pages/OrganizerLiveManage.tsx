import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addMinutes, parseISO, differenceInMilliseconds, isAfter, isBefore, format } from "date-fns";
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
import { ArrowLeft, Radio, Clock, Megaphone, Send, Users, Plus, Trash2, X, ChevronDown, Flag, AlertTriangle, Pencil, Check, History, ChevronRight, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import tracksideLogo from "@/assets/trackside-logo-v2.png";
import { FailoverTransport, encodeFlagPayload } from "@/lib/transport";
import { useSimConfig } from "@/hooks/useSimStore";
import PairedRadiosPanel from "@/components/PairedRadiosPanel";
import ConnectivityCheckPanel from "@/components/ConnectivityCheckPanel";
import LiveTrackMap from "@/components/LiveTrackMap";

interface EventSession {
  id?: string;
  registration_type_id: string | null;
  run_group_id: string | null;
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
  id: string;
  user_id: string;
  user_name: string;
  car_number: number | null;
  registration_type_id: string;
  run_group_id: string | null;
  crew_enabled: boolean;
  radio_node_id?: string | null;
  radio_last_seen?: string | null;
}

const OrganizerLiveManage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { organizerProfileId } = useOrganizerMode();
  const { toast } = useToast();
  const { enabled: simEnabled } = useSimConfig();
  const flagTransportRef = useRef<FailoverTransport | null>(null);

  // Spin up a failover transport for mirroring race-control flags over LoRa
  // when the sim is on. Inserts to event_flags still happen normally; this is
  // an additional "radio" broadcast so racers without cell can hear flags.
  useEffect(() => {
    if (!simEnabled || !eventId || !user?.id) {
      flagTransportRef.current?.destroy?.();
      flagTransportRef.current = null;
      return;
    }
    flagTransportRef.current = new FailoverTransport({ eventId, userId: user.id });
    return () => {
      flagTransportRef.current?.destroy?.();
      flagTransportRef.current = null;
    };
  }, [simEnabled, eventId, user?.id]);

  const mirrorFlagOverLoRa = useCallback((flagType: string, message: string | null) => {
    if (!simEnabled || !user?.id || !flagTransportRef.current) return;
    try {
      const payload = encodeFlagPayload({ flagType, message, organizerUserId: user.id });
      // Fire-and-forget — we don't block the UI on radio delivery
      flagTransportRef.current.send(payload).catch((err) => {
        console.warn("[lora-sim] flag mirror send failed:", err);
        toast({
          title: "LoRa mirror failed",
          description: (err as Error)?.message ?? "Radio leg dropped this packet.",
          variant: "destructive",
        });
      });
    } catch (err) {
      console.warn("[lora-sim] flag encode failed:", err);
      toast({
        title: "LoRa encode failed",
        description: (err as Error)?.message ?? "Payload exceeded byte budget.",
        variant: "destructive",
      });
    }
  }, [simEnabled, user?.id, toast]);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [registrationTypes, setRegistrationTypes] = useState<RegistrationType[]>([]); // run groups for display
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
  const [blackFlagGroupFilter, setBlackFlagGroupFilter] = useState<"active" | "all">("active");
  const [showYellowFlagDialog, setShowYellowFlagDialog] = useState(false);
  const [yellowFlagTurns, setYellowFlagTurns] = useState("");
  const [yellowFlagMessage, setYellowFlagMessage] = useState("");
  const [showBlueFlagDialog, setShowBlueFlagDialog] = useState(false);
  const [blueFlagTarget, setBlueFlagTarget] = useState<string>("all");
  const [blueFlagMessage, setBlueFlagMessage] = useState("");
  const [blueFlagSearch, setBlueFlagSearch] = useState("");
  const [blueFlagGroupFilter, setBlueFlagGroupFilter] = useState<"active" | "all">("active");
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
        (supabase as any).from("run_groups").select("id, name").eq("event_id", eventId).order("sort_order"),
        supabase.from("event_announcements").select("id, message, created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
        supabase.from("event_registrations").select("id, user_id, user_name, car_number, registration_type_id, run_group_id, crew_enabled").eq("event_id", eventId),
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
          run_group_id: s.run_group_id,
          name: s.name,
          start_time: s.start_time || "",
          duration_minutes: s.duration_minutes,
          sort_order: s.sort_order,
        }))
      );
      setRegistrationTypes((regTypesRes.data as RegistrationType[]) || []);
      setAnnouncements((annRes.data as Announcement[]) || []);
      setTotalRegistrations(regsRes.data?.length || 0);

      // Join paired LoRa radios for this event's registrations
      const regs = (regsRes.data as EventRegistrationWithCar[]) || [];
      if (regs.length > 0) {
        const regIds = regs.map((r) => r.id);
        const { data: pairedRows } = await (supabase as any)
          .from("lora_paired_devices")
          .select("event_registration_id, meshtastic_node_id, last_seen_at")
          .in("event_registration_id", regIds);
        const pairedMap = new Map<string, { node: string | null; lastSeen: string | null }>();
        (pairedRows || []).forEach((p: any) => {
          pairedMap.set(p.event_registration_id, {
            node: p.meshtastic_node_id,
            lastSeen: p.last_seen_at,
          });
        });
        setRegistrations(regs.map((r) => {
          const p = pairedMap.get(r.id);
          return { ...r, radio_node_id: p?.node ?? null, radio_last_seen: p?.lastSeen ?? null };
        }));
      } else {
        setRegistrations(regs);
      }
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
                    run_group_id: s.run_group_id,
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
          supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", false).not("session_id", "is", null).order("created_at", { ascending: true })
            .then(({ data }) => { if (data) setFlagHistory(data as EventFlag[]); });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const syncClearedFlagsLocally = useCallback((flags: EventFlag[]) => {
    if (flags.length === 0) return;

    const clearedIds = new Set(flags.map((flag) => flag.id));

    setActiveFlags((prev) => prev.filter((flag) => !clearedIds.has(flag.id)));

    const sessionFlags = flags.filter((flag) => flag.session_id);
    if (sessionFlags.length === 0) return;

    setFlagHistory((prev) => {
      const existingIds = new Set(prev.map((flag) => flag.id));
      const additions = sessionFlags
        .filter((flag) => !existingIds.has(flag.id))
        .map((flag) => ({ ...flag, is_active: false }));

      if (additions.length === 0) return prev;

      return [...prev, ...additions].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const deactivateAllActiveFlags = useCallback(async () => {
    if (!eventId) return;

    const flagsToClear = activeFlags;

    const { error } = await supabase
      .from("event_flags")
      .update({ is_active: false })
      .eq("event_id", eventId)
      .eq("is_active", true);

    if (error) throw error;

    syncClearedFlagsLocally(flagsToClear);
  }, [activeFlags, eventId, syncClearedFlagsLocally]);

  const deactivateFlagsByIds = useCallback(async (flagIds: string[]) => {
    if (flagIds.length === 0) return;

    const flagsToClear = activeFlags.filter((flag) => flagIds.includes(flag.id));

    const { error } = await supabase
      .from("event_flags")
      .update({ is_active: false })
      .in("id", flagIds);

    if (error) throw error;

    syncClearedFlagsLocally(flagsToClear);
  }, [activeFlags, syncClearedFlagsLocally]);

  const insertSessionFlag = useCallback(async ({
    flagType,
    sessionId,
    message = null,
    isActive = true,
  }: {
    flagType: string;
    sessionId: string | null;
    message?: string | null;
    isActive?: boolean;
  }) => {
    if (!eventId || !organizerProfileId) return;

    const { error } = await supabase.from("event_flags").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      flag_type: flagType,
      message,
      is_active: isActive,
      session_id: sessionId,
    });

    if (error) throw error;
  }, [eventId, organizerProfileId]);

  const handleUpdateSession = async (sessionId: string, field: string, value: any) => {
    const updatePayload: Record<string, any> = { [field]: value };
    const { error } = await supabase
      .from("public_event_sessions")
      .update(updatePayload as any)
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

  // Check if the server already sent a flag of this type for the current session
  const checkServerAlreadySent = useCallback(async (flagType: string, sessionId: string | null): Promise<boolean> => {
    if (!eventId || !sessionId) return false;
    const { data } = await supabase
      .from("event_flags")
      .select("id")
      .eq("event_id", eventId)
      .eq("session_id", sessionId)
      .eq("flag_type", flagType)
      .eq("is_active", true)
      .limit(1);
    return (data && data.length > 0) || false;
  }, [eventId]);

  const handleSendFlag = async (flagType: string) => {
    if (!eventId || !organizerProfileId) return;

    // For green/checkered, check if server already sent one for this session
    if ((flagType === "green" || flagType === "checkered") && activeSessionIdRef.current) {
      const alreadySent = await checkServerAlreadySent(flagType, activeSessionIdRef.current);
      if (alreadySent) {
        toast({ title: `${flagType === "green" ? "🟢 Green" : "🏁 Checkered"} flag already active (auto-sent)` });
        return;
      }
    }

    // Deactivate all existing flags (except local yellows and blue flags which are managed separately)
    // For checkered flags, deactivate ALL flags (including local); for other flags, preserve local cautions
    if (flagType === "checkered") {
      await deactivateAllActiveFlags();
    } else {
      await supabase.from("event_flags").update({ is_active: false }).eq("event_id", eventId).eq("is_active", true).neq("flag_type", "yellow_turn").neq("flag_type", "blue");
    }
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
      mirrorFlagOverLoRa(flagType, flagMessage.trim() || null);
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
      mirrorFlagOverLoRa("yellow_turn", fullMessage);
      toast({ title: `⚠️ Yellow flag sent for Turn ${yellowFlagTurns.trim()}` });
      setShowYellowFlagDialog(false);
      setYellowFlagTurns("");
      setYellowFlagMessage("");
    }
  };

  const handleSendBlueFlag = async () => {
    if (!eventId || !organizerProfileId) return;
    const reg = blueFlagTarget === "all" ? null : registrations.find(r => r.id === blueFlagTarget);
    const targetUserId = reg?.user_id || null;
    const carLabel = reg?.car_number ? `Car #${reg.car_number}` : "";
    const groupName = reg ? (registrationTypes.find(rt => rt.id === reg.run_group_id)?.name || "") : "";
    const fullMessage = [carLabel, groupName, blueFlagMessage.trim()].filter(Boolean).join(" — ") || "Faster traffic approaching";
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
      mirrorFlagOverLoRa("blue", fullMessage);
      toast({ title: reg?.car_number ? `🔵 Blue flag sent to Car #${reg.car_number}` : `🔵 Blue flag sent!` });
      setShowBlueFlagDialog(false);
      setBlueFlagTarget("all");
      setBlueFlagMessage("");
      setBlueFlagSearch("");
      setBlueFlagGroupFilter("active");
    }
  };

  const handleClearSingleFlag = async (flagId: string) => {
    const flag = activeFlags.find(f => f.id === flagId);
    const { error } = await supabase
      .from("event_flags")
      .update({ is_active: false })
      .eq("id", flagId);

    if (error) {
      toast({ title: "Failed to clear flag", variant: "destructive" });
      return;
    }

    if (flag) {
      syncClearedFlagsLocally([flag]);
    }
    
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
    const reg = blackFlagTarget === "all" ? null : registrations.find(r => r.id === blackFlagTarget);
    const targetUserId = reg?.user_id || null;
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
    const groupName = reg ? (registrationTypes.find(rt => rt.id === reg.run_group_id)?.name || "") : "";
    const messagePrefix = reg?.car_number ? `Car #${reg.car_number}` : null;
    const fullMessage = [messagePrefix, groupName, blackFlagMessage.trim()].filter(Boolean).join(" — ") || null;
    const { error } = await supabase.from("event_flags").insert({
      event_id: eventId,
      organizer_id: organizerProfileId,
      flag_type: "black",
      message: fullMessage,
      target_user_id: targetUserId,
      is_active: true,
      session_id: activeSessionIdRef.current,
    });
    if (error) {
      toast({ title: "Failed to send black flag", variant: "destructive" });
    } else {
      mirrorFlagOverLoRa("black", fullMessage);
      toast({ title: reg?.car_number ? `🏴 Black flag sent to Car #${reg.car_number}` : "🏴 Black flag sent to all drivers" });
      setShowBlackFlagDialog(false);
      setBlackFlagTarget("all");
      setBlackFlagMessage("");
      setBlackFlagSearch("");
      setBlackFlagGroupFilter("active");
    }
  };

  const handleClearFlags = async () => {
    if (!eventId) return;
    await deactivateAllActiveFlags();
    toast({ title: "All flags cleared" });
  };

  const handleToggleCrewEnabled = async (registrationId: string, currentValue: boolean) => {
    const { error } = await (supabase as any)
      .from("event_registrations")
      .update({ crew_enabled: !currentValue })
      .eq("id", registrationId);
    if (error) {
      toast({ title: "Failed to update crew access", variant: "destructive" });
    } else {
      setRegistrations(prev =>
        prev.map(r => r.id === registrationId ? { ...r, crew_enabled: !currentValue } : r)
      );
      toast({ title: !currentValue ? "Crew messaging enabled" : "Crew messaging disabled" });
    }
  };

  const getRunGroupName = (runGroupId: string | null) => {
    if (!runGroupId) return "All groups";
    return registrationTypes.find((rt) => rt.id === runGroupId)?.name || "Unknown";
  };

  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => {
      const sortDiff = (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER);
      if (sortDiff !== 0) return sortDiff;
      // When sort_order is equal, order by start_time so the earlier session comes first
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return (a.id || "").localeCompare(b.id || "");
    }),
    [sessions]
  );

  const sessionStates = useMemo(() => {
    if (!eventDate) return [];
    const now = currentTime;
    const evDate = parseISO(eventDate + "T00:00:00");

    // First pass: find the active session (currently running by time)
    let activeId: string | null = null;
    let activeIdx = -1;
    orderedSessions.forEach((s, i) => {
      if (!s.start_time || !s.duration_minutes) return;
      const [h, m] = s.start_time.split(":").map(Number);
      const start = new Date(evDate);
      start.setHours(h, m, 0, 0);
      const end = addMinutes(start, s.duration_minutes);
      if (isAfter(now, start) && isBefore(now, end)) {
        activeId = s.id;
        activeIdx = i;
      }
    });

    // Second pass: assign states based on sort_order position relative to active session
    // If there's an active session, everything before it is completed, everything after is upcoming
    // If there's no active session, find the first session whose start_time hasn't ended yet
    let firstUpcomingIdx = -1;
    if (activeIdx === -1) {
      // No active session — find the first session that hasn't ended yet (or has no time)
      firstUpcomingIdx = orderedSessions.findIndex((s) => {
        if (!s.start_time || !s.duration_minutes) return true; // no time = upcoming candidate
        const [h, m] = s.start_time.split(":").map(Number);
        const start = new Date(evDate);
        start.setHours(h, m, 0, 0);
        const end = addMinutes(start, s.duration_minutes);
        return !isAfter(now, end); // hasn't ended yet
      });
      // If all timed sessions have ended, treat them all as completed (firstUpcomingIdx stays -1 means all done)
    }

    return orderedSessions.map((s, i) => {
      if (s.id === activeId) return { ...s, state: "active" as const };
      if (activeIdx >= 0) {
        return { ...s, state: i < activeIdx ? "completed" as const : "upcoming" as const };
      }
      // No active session
      if (firstUpcomingIdx >= 0) {
        return { ...s, state: i < firstUpcomingIdx ? "completed" as const : "upcoming" as const };
      }
      // All sessions have ended
      return { ...s, state: "completed" as const };
    });
  }, [orderedSessions, eventDate, currentTime]);

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

  // Auto-deactivate checkered flags older than 2 minutes (reliable polling fallback)
  const CHECKERED_TTL_MS = 120000;
  useEffect(() => {
    const checkeredFlags = activeFlags.filter(f => f.flag_type === "checkered");
    if (checkeredFlags.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const f of checkeredFlags) {
      const age = Date.now() - new Date(f.created_at).getTime();
      const remaining = CHECKERED_TTL_MS - age;
      if (remaining <= 0) {
        supabase
          .from("event_flags")
          .update({ is_active: false })
          .eq("id", f.id)
          .then(({ error }) => {
            if (!error) {
              syncClearedFlagsLocally([f]);
            }
          });
      } else {
        timers.push(setTimeout(() => {
          supabase
            .from("event_flags")
            .update({ is_active: false })
            .eq("id", f.id)
            .then(({ error }) => {
              if (!error) {
                syncClearedFlagsLocally([f]);
              }
            });
        }, remaining));
      }
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [activeFlags, syncClearedFlagsLocally]);

  const isBlueExpired = (f: EventFlag) => f.flag_type === "blue" && (Date.now() - new Date(f.created_at).getTime()) >= BLUE_FLAG_TTL_MS;
  const isLocalCaution = (f: EventFlag) => f.flag_type === "yellow_turn" || (f.flag_type === "blue" && !isBlueExpired(f)) || (f.flag_type === "black" && f.target_user_id);

  const activeSession = sessionStates.find((s) => s.state === "active");
  const activeSessionRunGroupId = activeSession?.run_group_id || null;
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSession?.id || null;

  // Helper: filter registrations by group
  const getFilteredRegistrations = (filter: "active" | "all", search: string) => {
    let filtered = registrations;
    if (filter === "active" && activeSessionRunGroupId) {
      filtered = filtered.filter(r => r.run_group_id === activeSessionRunGroupId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => r.car_number?.toString().includes(q) || r.user_name.toLowerCase().includes(q));
    }
    return filtered;
  };

  // Group registrations by registration type
  const groupRegistrationsByType = (regs: EventRegistrationWithCar[]) => {
    const groups: Record<string, EventRegistrationWithCar[]> = {};
    for (const r of regs) {
      const groupName = r.run_group_id
        ? (registrationTypes.find(rt => rt.id === r.run_group_id)?.name || "Unknown")
        : "No Run Group";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(r);
    }
    return groups;
  };

  // Auto-send checkered flag when a session ends
  const prevActiveSessionId = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !eventId || !organizerProfileId) return;

    const currentActiveId = activeSession?.id || null;
    const prevId = prevActiveSessionId.current;
    const staleFlagIds = activeFlags
      .filter((flag) => flag.session_id && flag.session_id !== currentActiveId)
      .map((flag) => flag.id);
    const hasCurrentSessionTrackStatus = activeFlags.some(
      (flag) => flag.session_id === currentActiveId && !isLocalCaution(flag) && flag.flag_type !== "checkered"
    );

    if (prevId === currentActiveId) return;

    prevActiveSessionId.current = currentActiveId;

    const syncSessionFlags = async () => {
      try {
        // Session changed directly from one run group to another (e.g. tab throttling skipped the gap)
        if (prevId && currentActiveId && prevId !== currentActiveId) {
          // Check if server already handled the checkered for prev session
          const checkeredExists = await checkServerAlreadySent("checkered", prevId);
          const greenExists = await checkServerAlreadySent("green", currentActiveId);

          if (!checkeredExists) {
            await deactivateAllActiveFlags();
            await insertSessionFlag({
              flagType: "checkered",
              sessionId: prevId,
              message: "Session complete",
              isActive: true,
            });
            toast({ title: "🏁 Checkered flag — session complete" });
            // Brief delay so checkered is visible before green
            await new Promise(r => setTimeout(r, 3000));
          }
          if (!greenExists) {
            await insertSessionFlag({
              flagType: "green",
              sessionId: currentActiveId,
            });
            toast({ title: "🟢 Green flag auto-sent — session changed" });
          } else {
            toast({ title: "🟢 Green flag already active (auto-sent by server)" });
          }
          return;
        }

        // Session just started (or page loaded mid-session) — clear stale previous-session flags first
        if (!prevId && currentActiveId) {
          if (staleFlagIds.length > 0) {
            await deactivateFlagsByIds(staleFlagIds);
          }

          if (!hasCurrentSessionTrackStatus) {
            // Check if server already sent the green
            const greenExists = await checkServerAlreadySent("green", currentActiveId);
            if (!greenExists) {
              await insertSessionFlag({
                flagType: "green",
                sessionId: currentActiveId,
              });
              toast({ title: "🟢 Green flag auto-sent — session started" });
            } else {
              toast({ title: "🟢 Green flag already active (auto-sent by server)" });
            }
          }

          return;
        }

        // Session just ended (had prev active → now none)
        if (prevId && !currentActiveId) {
          const checkeredExists = await checkServerAlreadySent("checkered", prevId);
          if (!checkeredExists) {
            await deactivateAllActiveFlags();
            await insertSessionFlag({
              flagType: "checkered",
              sessionId: prevId,
              message: "Session complete",
            });
            toast({ title: "🏁 Checkered flag auto-sent — session ended" });
          } else {
            toast({ title: "🏁 Checkered flag already sent (auto-sent by server)" });
          }
          // Checkered auto-deactivation is handled by the useEffect polling above
        }
      } catch (error) {
        console.error("Failed to sync session flags", error);
        toast({ title: "Failed to sync track status", variant: "destructive" });
      }
    };

    void syncSessionFlags();
  }, [activeSession?.id, activeFlags, deactivateAllActiveFlags, deactivateFlagsByIds, eventId, insertSessionFlag, isLocalCaution, loading, organizerProfileId, toast]);
  const activeRemaining = useMemo(() => {
    if (!activeSession?.start_time || !activeSession?.duration_minutes || !eventDate) return null;
    const evDate = parseISO(eventDate + "T00:00:00");
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
    const evDate = parseISO(eventDate + "T00:00:00");
    // Find the first upcoming session by sort_order (sessionStates is already sorted by sort_order)
    const next = sessionStates.find((s) => s.state === "upcoming");
    if (!next) return null;
    // If the next session has a start_time, show countdown
    if (next.start_time) {
      const [h, m] = next.start_time.split(":").map(Number);
      const start = new Date(evDate);
      start.setHours(h, m, 0, 0);
      const diffMs = differenceInMilliseconds(start, currentTime);
      if (diffMs <= 0) return { hours: 0, minutes: 0, seconds: 0, isBufferZone: true, sessionName: next.name, runGroup: getRunGroupName(next.run_group_id) };
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      const isBufferZone = diffMs <= 5 * 60 * 1000;
      return { hours: hrs, minutes: mins, seconds: secs, isBufferZone, sessionName: next.name, runGroup: getRunGroupName(next.run_group_id) };
    }
    // No start_time — just show the session name without countdown
    return { hours: 0, minutes: 0, seconds: 0, isBufferZone: false, sessionName: next.name, runGroup: getRunGroupName(next.run_group_id) };
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
      <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border hidden lg:block"><div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-20"><Link to="/dashboard" className="flex items-center h-full py-1"><img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" /></Link><div className="flex items-center gap-1">{[{ label: "Home", path: "/dashboard" }, { label: "Garage", path: "/garage" }, { label: "GridID", path: "/grid-id" }, { label: "Events", path: "/events" }, { label: "Local Events", path: "/local-events" }, { label: "Organizer", path: "/event-organizer" }, { label: "Settings", path: "/settings" }].map((item) => (<Button key={item.path} variant={location.pathname === item.path ? "default" : "ghost"} size="sm" asChild><Link to={item.path}>{item.label}</Link></Button>))}<Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }} className="text-destructive hover:text-destructive"><LogOut size={16} className="mr-1" /> Logout</Button></div></div></motion.nav>

      <div className="pt-0 lg:pt-20 max-w-4xl lg:max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="glass"
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
                    {getRunGroupName(activeSession.run_group_id)} • Started at {activeSession.start_time}
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

        {/* Standby Banner — between sessions after a session has ended */}
        {!activeSession && nextCountdown && sessionStates.some(s => s.state === "completed") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-muted-foreground/30 bg-muted/20 backdrop-blur-sm p-5 sm:p-6 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏁</span>
                <div>
                  <p className="text-lg font-bold text-foreground">Standby</p>
                  <p className="text-sm text-muted-foreground">
                    Session complete — waiting for next session
                  </p>
                </div>
              </div>
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

        {/* 2-column race-control grid: action surface (left) + situational awareness (right, sticky) */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="space-y-6">
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
                            {getRunGroupName(s.run_group_id)}
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
                              value={s.run_group_id || "none"}
                              onValueChange={(v) =>
                                handleUpdateSession(
                                  s.id!,
                                  "run_group_id",
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

        {/* Flag History Review */}
        {sessionStates.length > 0 && (
          <>
            <Separator className="mb-6" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <History size={16} className="text-primary" /> Flag Review by Session
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Review all flags sent during each session — including stats and details.
              </p>
              <div className="space-y-2">
                {sessionStates
                  .map(session => {
                    const sessionFlags = flagHistory.filter(f => f.session_id === session.id);
                    const activeSessionFlags = activeFlags.filter(f => f.session_id === session.id);
                    const allSessionFlags = [...sessionFlags, ...activeSessionFlags];
                    const isExpanded = expandedHistorySession === session.id;

                    const flagCounts: Record<string, number> = {};
                    allSessionFlags.forEach(f => {
                      const label = f.flag_type === "yellow_turn" ? "yellow (local)" : f.flag_type === "black" && f.target_user_id ? "black (targeted)" : f.flag_type;
                      flagCounts[label] = (flagCounts[label] || 0) + 1;
                    });

                    return (
                      <Card key={session.id} className="bg-card/80 border-border">
                        <CardContent className="p-0">
                          <button
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
                            onClick={() => setExpandedHistorySession(isExpanded ? null : session.id!)}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight size={14} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              <span className="text-sm font-medium">{session.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {getRunGroupName(session.run_group_id)}
                              </Badge>
                              <Badge variant={session.state === "active" ? "default" : "secondary"} className="text-[10px]">
                                {session.state === "active" ? "Active" : session.state === "completed" ? "Completed" : "Upcoming"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {allSessionFlags.length === 0 ? (
                                <span className="text-[10px] text-muted-foreground">No flags</span>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  {allSessionFlags.length} flag{allSessionFlags.length !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-3">
                              {allSessionFlags.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic pl-6">No flags were recorded during this session.</p>
                              ) : (
                                <>
                                  {/* Stats Summary */}
                                  <div className="flex flex-wrap gap-1.5 pl-6">
                                    {Object.entries(flagCounts).map(([type, count]) => (
                                      <Badge key={type} variant="outline" className="text-[10px] gap-1">
                                        <span>
                                          {type === "green" ? "🟢" : type === "yellow" ? "⚠️" : type === "yellow (local)" ? "⚠️" : type === "red" ? "🔴" : type.startsWith("black") ? "🏴" : type === "blue" ? "🔵" : type === "white" ? "🏳️" : type === "checkered" ? "🏁" : "🚩"}
                                        </span>
                                        {type} × {count}
                                      </Badge>
                                    ))}
                                  </div>

                                  {/* Detailed Flag List */}
                                  <div className="pl-6 space-y-1.5 max-h-60 overflow-y-auto">
                                    {allSessionFlags.map(f => {
                                      const flagTime = format(new Date(f.created_at), "h:mm:ss a");
                                      const flagEmoji = f.flag_type === "green" ? "🟢" : f.flag_type === "yellow" ? "⚠️" : f.flag_type === "yellow_turn" ? "⚠️" : f.flag_type === "red" ? "🔴" : f.flag_type === "black" ? "🏴" : f.flag_type === "blue" ? "🔵" : f.flag_type === "white" ? "🏳️" : "🏁";
                                      const label = f.flag_type === "yellow_turn" ? "Yellow (Local)" : f.flag_type === "black" && f.target_user_id ? "Black (Targeted)" : f.flag_type.charAt(0).toUpperCase() + f.flag_type.slice(1);

                                      return (
                                        <div key={f.id} className="flex items-start gap-2 text-xs bg-muted/30 rounded-md px-2.5 py-1.5">
                                          <span className="shrink-0 mt-0.5">{flagEmoji}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-medium">{label}</span>
                                              <span className="text-muted-foreground">at {flagTime}</span>
                                            </div>
                                            {f.message && <p className="text-muted-foreground truncate">{f.message}</p>}
                                          </div>
                                          <Badge variant={f.is_active ? "default" : "outline"} className="text-[9px] shrink-0">
                                            {f.is_active ? "Active" : "Cleared"}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </motion.div>
          </>
        )}
        </div>
        {/* Right column — situational awareness panels (sticky on widescreen) */}
        <div className="space-y-6 mt-6 lg:mt-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {/* Live Track Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            <LiveTrackMap
              eventId={eventId!}
              participants={registrations.map((r) => ({
                id: r.id,
                user_name: r.user_name,
                car_number: r.car_number,
                run_group_id: r.run_group_id,
              }))}
            />
          </motion.div>

          {/* Connectivity Check */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ConnectivityCheckPanel eventId={eventId!} />
          </motion.div>

          {/* Paired Radios by Run Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <PairedRadiosPanel participants={registrations} runGroups={registrationTypes} />
          </motion.div>

          {/* Participants — Crew Messaging Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-primary" /> Crew Messaging
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Enable crew messaging per driver so their pit crew can send real-time updates.
            </p>
            {registrations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No registrations yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {Object.entries(groupRegistrationsByType(registrations)).map(([groupName, groupRegs]) => (
                  <div key={groupName}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">{groupName}</p>
                    {groupRegs
                      .sort((a, b) => (a.car_number || 0) - (b.car_number || 0))
                      .map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 bg-card/60">
                        <div className="flex items-center gap-2 min-w-0">
                          {r.car_number && <Badge variant="outline" className="font-mono text-[10px] shrink-0">#{r.car_number}</Badge>}
                          <span className="text-sm truncate">{r.user_name}</span>
                          {(() => {
                            if (!r.radio_node_id) {
                              return <span title="No radio paired" className="text-muted-foreground text-[10px]">⚫</span>;
                            }
                            const stale = !r.radio_last_seen || (Date.now() - new Date(r.radio_last_seen).getTime() > 10 * 60 * 1000);
                            return (
                              <span
                                title={`Radio ${r.radio_node_id}${r.radio_last_seen ? ` · last seen ${new Date(r.radio_last_seen).toLocaleTimeString()}` : ""}`}
                                className={stale ? "text-yellow-400 text-[10px]" : "text-green-400 text-[10px]"}
                              >
                                {stale ? "🟡" : "🟢"} <span className="font-mono">{r.radio_node_id}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{r.crew_enabled ? "On" : "Off"}</span>
                          <Switch
                            checked={r.crew_enabled}
                            onCheckedChange={() => handleToggleCrewEnabled(r.id, r.crew_enabled)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
        </div>
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
      <Dialog open={showBlackFlagDialog} onOpenChange={(open) => {
        setShowBlackFlagDialog(open);
        if (open) { setBlackFlagGroupFilter("active"); setBlackFlagTarget("all"); setBlackFlagSearch(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🏴 Send Black Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium flex-1">Target Driver</Label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${blackFlagGroupFilter === "active" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    onClick={() => { setBlackFlagGroupFilter("active"); setBlackFlagTarget("all"); }}
                  >
                    Current Group
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${blackFlagGroupFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    onClick={() => { setBlackFlagGroupFilter("all"); setBlackFlagTarget("all"); }}
                  >
                    All Groups
                  </button>
                </div>
              </div>
              {blackFlagGroupFilter === "active" && !activeSessionRunGroupId && (
                <p className="text-[10px] text-muted-foreground italic">No active session — showing all drivers</p>
              )}
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
                {(() => {
                  const filtered = getFilteredRegistrations(blackFlagGroupFilter, blackFlagSearch)
                    .filter(r => r.car_number != null)
                    .sort((a, b) => (a.car_number || 0) - (b.car_number || 0));

                  if (blackFlagGroupFilter === "all" && !blackFlagSearch.trim()) {
                    const grouped = groupRegistrationsByType(filtered);
                    return Object.entries(grouped).map(([groupName, regs]) => (
                      <div key={groupName}>
                        <div className="px-3 py-1.5 bg-muted/60 sticky top-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {groupName}
                            {activeSessionRunGroupId && regs[0]?.run_group_id === activeSessionRunGroupId && (
                              <Badge variant="default" className="ml-2 text-[8px] px-1 py-0">Active</Badge>
                            )}
                          </span>
                        </div>
                        {regs.map(r => (
                          <div
                            key={r.id}
                            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${blackFlagTarget === r.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                            onClick={() => setBlackFlagTarget(r.id)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">#{r.car_number} — {r.user_name}</p>
                              <Badge variant="outline" className="text-[10px]">{groupName}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ));
                  }

                  return filtered.map(r => (
                    <div
                      key={r.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${blackFlagTarget === r.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                      onClick={() => setBlackFlagTarget(r.id)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">#{r.car_number} — {r.user_name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {registrationTypes.find(rt => rt.id === r.run_group_id)?.name || "—"}
                        </Badge>
                      </div>
                    </div>
                  ));
                })()}
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
      <Dialog open={showBlueFlagDialog} onOpenChange={(open) => {
        setShowBlueFlagDialog(open);
        if (open) { setBlueFlagGroupFilter("active"); setBlueFlagTarget("all"); setBlueFlagSearch(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🔵 Blue Flag — Faster Traffic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium flex-1">Target Driver (optional)</Label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${blueFlagGroupFilter === "active" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    onClick={() => { setBlueFlagGroupFilter("active"); setBlueFlagTarget("all"); }}
                  >
                    Current Group
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${blueFlagGroupFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    onClick={() => { setBlueFlagGroupFilter("all"); setBlueFlagTarget("all"); }}
                  >
                    All Groups
                  </button>
                </div>
              </div>
              {blueFlagGroupFilter === "active" && !activeSessionRunGroupId && (
                <p className="text-[10px] text-muted-foreground italic">No active session — showing all drivers</p>
              )}
              <Input
                value={blueFlagSearch}
                onChange={e => setBlueFlagSearch(e.target.value)}
                placeholder="Search by name or car #"
                className="text-sm"
              />
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-border">
                <div
                  className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${blueFlagTarget === "all" ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"}`}
                  onClick={() => setBlueFlagTarget("all")}
                >
                  <span className="text-sm font-medium">All Drivers</span>
                </div>
                {(() => {
                  const filtered = getFilteredRegistrations(blueFlagGroupFilter, blueFlagSearch)
                    .sort((a, b) => (a.car_number || 0) - (b.car_number || 0));

                  if (blueFlagGroupFilter === "all" && !blueFlagSearch.trim()) {
                    const grouped = groupRegistrationsByType(filtered);
                    return Object.entries(grouped).map(([groupName, regs]) => (
                      <div key={groupName}>
                        <div className="px-3 py-1.5 bg-muted/60 sticky top-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {groupName}
                            {activeSessionRunGroupId && regs[0]?.run_group_id === activeSessionRunGroupId && (
                              <Badge variant="default" className="ml-2 text-[8px] px-1 py-0">Active</Badge>
                            )}
                          </span>
                        </div>
                        {regs.map(r => (
                          <div
                            key={r.id}
                            className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${blueFlagTarget === r.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"}`}
                            onClick={() => setBlueFlagTarget(r.id)}
                          >
                            {r.car_number && <Badge variant="outline" className="font-mono text-[10px]">#{r.car_number}</Badge>}
                            <span className="text-sm">{r.user_name}</span>
                            <Badge variant="outline" className="text-[10px] ml-auto">{groupName}</Badge>
                          </div>
                        ))}
                      </div>
                    ));
                  }

                  return filtered.map(r => (
                    <div
                      key={r.id}
                      className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${blueFlagTarget === r.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"}`}
                      onClick={() => setBlueFlagTarget(r.id)}
                    >
                      {r.car_number && <Badge variant="outline" className="font-mono text-[10px]">#{r.car_number}</Badge>}
                      <span className="text-sm">{r.user_name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {registrationTypes.find(rt => rt.id === r.run_group_id)?.name || "—"}
                      </Badge>
                    </div>
                  ));
                })()}
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
