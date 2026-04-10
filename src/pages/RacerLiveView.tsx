import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { parseISO, addMinutes, differenceInMilliseconds, isAfter, isBefore, format } from "date-fns";
import { ArrowLeft, Volume2, StickyNote, Pencil, Check, X, TrendingUp, MessageSquare, Clock, Users, Copy, Map, Timer, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface EventFlag {
  id: string;
  flag_type: string;
  message: string | null;
  target_user_id: string | null;
  is_active: boolean;
  created_at: string;
  session_id: string | null;
}

interface Announcement {
  id: string;
  message: string;
  created_at: string;
}

interface EventSession {
  id: string;
  name: string;
  start_time: string | null;
  duration_minutes: number | null;
  sort_order: number;
  registration_type_id: string | null;
  run_group_id: string | null;
}

const FLAG_CONFIG: Record<string, { bg: string; text: string; label: string; textColor: string }> = {
  green: { bg: "bg-green-500", text: "GREEN", label: "Track Clear", textColor: "text-white" },
  yellow: { bg: "bg-yellow-400", text: "YELLOW", label: "FULL COURSE CAUTION", textColor: "text-black" },
  yellow_turn: { bg: "bg-yellow-400", text: "YELLOW", label: "LOCAL CAUTION", textColor: "text-black" },
  blue: { bg: "bg-blue-600", text: "BLUE FLAG", label: "FASTER TRAFFIC — YIELD", textColor: "text-white" },
  red: { bg: "bg-red-600", text: "RED", label: "STOP — SESSION HALTED", textColor: "text-white" },
  black: { bg: "bg-black", text: "BLACK FLAG", label: "PIT IN IMMEDIATELY", textColor: "text-white" },
  white: { bg: "bg-white border-2 border-gray-300", text: "WHITE", label: "Slow Vehicle Ahead", textColor: "text-black" },
  checkered: { bg: "bg-black", text: "🏁", label: "SESSION OVER", textColor: "text-white" },
};

const BLACK_FLAG_LOCKOUT_MS = 0; // Immediate accept

const RacerLiveView = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [flags, setFlags] = useState<EventFlag[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [userRegTypeIds, setUserRegTypeIds] = useState<Set<string>>(() => {
    if (!eventId) return new Set<string>();
    const stored = localStorage.getItem(`my-run-groups-${eventId}`);
    if (stored) {
      try { return new Set(JSON.parse(stored).map(String)); } catch { return new Set<string>(); }
    }
    return new Set<string>();
  });
  const [regTypeName, setRegTypeName] = useState<string | null>(null);
  const [userCarNumber, setUserCarNumber] = useState<number | null>(null);
  const [runGroupNames, setRunGroupNames] = useState<Record<string, string>>({});

  // Driver communication state
  const [personalEventId, setPersonalEventId] = useState<string | null>(null);
  const [crewEnabled, setCrewEnabled] = useState(false);
  const [crewMessages, setCrewMessages] = useState<{ id: string; gap_ahead: string | null; message: string | null; created_at: string; position: string | null; time_remaining: string | null }[]>([]);
  const [trackNotes, setTrackNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [rightCard, setRightCard] = useState<'gap' | 'map' | 'lap'>(() => {
    const saved = localStorage.getItem(`right-card-${eventId}`);
    return (saved === 'gap' || saved === 'map' || saved === 'lap') ? saved : 'gap';
  });
  const [trackMapUrl, setTrackMapUrl] = useState<string | null>(null);
  const [trackMapUploading, setTrackMapUploading] = useState(false);
  const trackMapInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  

  // Black flag accept state
  const [blackFlagAccepted, setBlackFlagAccepted] = useState<string | null>(null);
  const [blackFlagAcceptedAt, setBlackFlagAcceptedAt] = useState<number | null>(null);
  const [blackFlagDismissed, setBlackFlagDismissed] = useState<Set<string>>(new Set());
  const [blackFlagReceivedAt, setBlackFlagReceivedAt] = useState<Record<string, number>>({});
  const prevFlagIdsRef = useRef<Set<string>>(new Set());

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    };
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLock?.release();
    };
  }, []);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Read run group selections from localStorage
  const readRunGroupsFromStorage = useCallback(async () => {
    if (!eventId || !user?.id) return [] as string[];

    const publicKey = `my-run-groups-${eventId}`;
    const { data: personalEvent } = await (supabase as any)
      .from("events")
      .select("id")
      .eq("public_event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    const legacyKey = personalEvent?.id ? `my-run-groups-${personalEvent.id}` : null;
    const stored = localStorage.getItem(publicKey) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);

    if (stored) {
      try {
        const ids = JSON.parse(stored).map(String) as string[];
        setUserRegTypeIds(new Set(ids));
        if (legacyKey && !localStorage.getItem(publicKey)) {
          localStorage.setItem(publicKey, JSON.stringify(ids));
        }
        return ids;
      } catch {
        // Don't clear — let the registration fallback in fetchData handle it
      }
    }
    // Don't setUserRegTypeIds(new Set()) here — it creates a race with the fallback

    return [] as string[];
  }, [eventId, user?.id]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const [eventRes, sessRes, flagRes, annRes, regRes] = await Promise.all([
      supabase.from("public_events").select("name, date").eq("id", eventId).single(),
      supabase.from("public_event_sessions").select("*").eq("event_id", eventId).order("sort_order"),
      supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", true),
      supabase.from("event_announcements").select("id, message, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(10),
      user ? supabase.from("event_registrations").select("run_group_id, car_number, crew_enabled").eq("event_id", eventId).eq("user_id", user.id) : Promise.resolve({ data: null }),
    ]);
    if (eventRes.data) {
      setEventName(eventRes.data.name);
      setEventDate(eventRes.data.date);
    }
    setSessions((sessRes.data as EventSession[]) || []);
    setFlags((flagRes.data as EventFlag[]) || []);
    setAnnouncements((annRes.data as Announcement[]) || []);

    const registrations = regRes.data as any[] | null;
    const registeredCarNumber = registrations && registrations.length > 0 ? registrations[0].car_number : null;
    if (registeredCarNumber) setUserCarNumber(registeredCarNumber);
    // Check if any registration has crew_enabled
    const hasCrewEnabled = registrations?.some((r: any) => r.crew_enabled) || false;
    setCrewEnabled(hasCrewEnabled);

    // Read localStorage for selected run groups (including legacy per-personal-event key)
    const storedIds = await readRunGroupsFromStorage();

    // If no saved selection exists, fall back to all registered group IDs
    const fallbackIds = registrations?.map((r: any) => String(r.run_group_id)).filter((v: string) => v && v !== 'null') || [];
    const effectiveIds = storedIds.length > 0 ? storedIds : fallbackIds;

    if (storedIds.length === 0 && fallbackIds.length > 0) {
      setUserRegTypeIds(new Set(fallbackIds));
      // Persist so subsequent renders / visibility changes don't reset to empty
      localStorage.setItem(`my-run-groups-${eventId}`, JSON.stringify(fallbackIds));
    }

    // Set display name from first selected group
    if (effectiveIds.length > 0) {
      const { data: rgData } = await (supabase as any).from("run_groups").select("id, name").in("id", effectiveIds);
      if (rgData) {
        const nameMap: Record<string, string> = {};
        (rgData as any[]).forEach((rg: any) => { nameMap[rg.id] = rg.name; });
        setRunGroupNames(nameMap);
        const firstName = (rgData as any[])[0]?.name || null;
        if (firstName) setRegTypeName(firstName);
      }
    }

    setLoading(false);
  }, [eventId, readRunGroupsFromStorage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen for storage changes (cross-tab) and visibility changes (same-tab navigation)
  useEffect(() => {
    if (!eventId) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `my-run-groups-${eventId}`) {
        readRunGroupsFromStorage();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        readRunGroupsFromStorage();
      }
    };
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [eventId, readRunGroupsFromStorage]);

  // Realtime
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`racer-live-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_flags", filter: `event_id=eq.${eventId}` }, () => {
        supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", true)
          .then(({ data }) => {
            if (data) setFlags(data as EventFlag[]);
          });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_announcements", filter: `event_id=eq.${eventId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newAnn = payload.new as Announcement;
          setAnnouncements(prev => [newAnn, ...prev].slice(0, 10));
          toast({ title: "📢 Announcement", description: newAnn.message });
        } else if (payload.eventType === "DELETE") {
          setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "public_event_sessions", filter: `event_id=eq.${eventId}` }, () => {
        supabase.from("public_event_sessions").select("*").eq("event_id", eventId).order("sort_order")
          .then(({ data }) => { if (data) setSessions(data as EventSession[]); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, toast]);

  // --- Driver Communication: find personal event, load track notes, subscribe to crew messages ---
  useEffect(() => {
    if (!eventId || !user?.id) return;
    const findPersonalEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, track_map_url")
        .eq("public_event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.id) {
        setPersonalEventId(data.id);
        const savedNotes = localStorage.getItem(`track-notes-${data.id}`);
        if (savedNotes) setTrackNotes(savedNotes);
        if (data.track_map_url) {
          // Get signed URL for the track map
          const { data: signedData } = await supabase.storage
            .from("track-maps")
            .createSignedUrl(data.track_map_url, 3600);
          if (signedData?.signedUrl) setTrackMapUrl(signedData.signedUrl);
        }
      }
    };
    findPersonalEvent();
  }, [eventId, user?.id]);

  // Load & subscribe to crew messages for the personal event
  useEffect(() => {
    if (!personalEventId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("crew_messages")
        .select("*")
        .eq("event_id", personalEventId)
        .order("created_at", { ascending: true });
      if (data) setCrewMessages(data as any[]);
    };
    loadMessages();

    const channel = supabase
      .channel(`racer-crew-${personalEventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crew_messages", filter: `event_id=eq.${personalEventId}` },
        (payload) => {
          setCrewMessages(prev => [...prev, payload.new as any]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [personalEventId]);

  // Auto-scroll crew feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [crewMessages.length]);

  const saveTrackNotes = () => {
    if (!personalEventId) return;
    localStorage.setItem(`track-notes-${personalEventId}`, notesDraft);
    setTrackNotes(notesDraft);
    setIsEditingNotes(false);
  };

  const handleTrackMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !personalEventId) return;
    setTrackMapUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${personalEventId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("track-maps")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      await (supabase as any).from("events").update({ track_map_url: path }).eq("id", personalEventId).eq("user_id", user.id);
      const { data: signedData } = await supabase.storage
        .from("track-maps")
        .createSignedUrl(path, 3600);
      if (signedData?.signedUrl) setTrackMapUrl(signedData.signedUrl);
      toast({ title: "Track map uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setTrackMapUploading(false);
      if (trackMapInputRef.current) trackMapInputRef.current.value = "";
    }
  };

  const latestGap = useMemo(() => {
    return [...crewMessages].reverse().find(m => m.gap_ahead)?.gap_ahead || null;
  }, [crewMessages]);

  const latestCrewMessage = useMemo(() => {
    return [...crewMessages].reverse().find(m => m.message)?.message || null;
  }, [crewMessages]);

  const formatCrewTime = (ts: string) => {
    try { return format(new Date(ts), "h:mm:ss a"); } catch { return ts; }
  };

  // Active flags for this user
  const activeFlags = useMemo(() => {
    return flags.filter(f => {
      if (!f.is_active) return false;
      if (f.target_user_id && f.target_user_id !== user?.id) return false;
      if (blackFlagDismissed.has(f.id)) return false;
      return true;
    });
  }, [flags, user?.id, blackFlagDismissed]);

  // Yellow-by-turn flags are shown as banners, not in the priority system
  const yellowTurnFlags = useMemo(() => {
    return activeFlags.filter(f => f.flag_type === "yellow_turn");
  }, [activeFlags]);

  // Blue flags shown as banners — auto-expire after 10s
  const BLUE_FLAG_TTL_MS = 10_000;
  const [, setBlueTick] = useState(0);
  useEffect(() => {
    const blues = activeFlags.filter(f => f.flag_type === "blue");
    if (blues.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const f of blues) {
      const remaining = BLUE_FLAG_TTL_MS - (Date.now() - new Date(f.created_at).getTime());
      if (remaining > 0) {
        timers.push(setTimeout(() => setBlueTick(t => t + 1), remaining));
      }
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [activeFlags]);

  const blueFlags = useMemo(() => {
    const now = Date.now();
    return activeFlags.filter(f => f.flag_type === "blue" && (f.target_user_id === null || f.target_user_id === user?.id) && (now - new Date(f.created_at).getTime()) < BLUE_FLAG_TTL_MS);
  }, [activeFlags, user?.id]);

  // Helper: does a session match the user's selected run groups (by ID or trimmed name)?
  const sessionMatchesMyGroups = useCallback((s: { run_group_id: string | null; name: string }) => {
    if (userRegTypeIds.size === 0) return true;
    if (s.run_group_id && userRegTypeIds.has(s.run_group_id)) return true;
    // Fallback: match session name against run group names (trimmed)
    const groupNamesList = Object.values(runGroupNames);
    if (groupNamesList.length > 0) {
      return groupNamesList.some(gName => s.name.trim() === gName.trim());
    }
    return false;
  }, [userRegTypeIds, runGroupNames]);

  // Non-yellow-turn, non-blue flags for priority display
  // Filter session-specific flags (green, checkered) by user's run groups
  const priorityFlags = useMemo(() => {
    const sessionRunGroupTypes = ["green", "checkered"];
    return activeFlags.filter(f => {
      if (f.flag_type === "yellow_turn" || f.flag_type === "blue") return false;
      if (userRegTypeIds.size > 0 && sessionRunGroupTypes.includes(f.flag_type) && f.session_id) {
        const flagSession = sessions.find(s => s.id === f.session_id);
        if (flagSession && !sessionMatchesMyGroups(flagSession)) {
          return false; // This flag is for a different run group
        }
      }
      return true;
    });
  }, [activeFlags, userRegTypeIds, sessions, sessionMatchesMyGroups]);

  // Track when targeted black flags first appear + vibrate
  useEffect(() => {
    const currentIds = new Set(activeFlags.map(f => f.id));
    const newTargetedBlackFlags = activeFlags.filter(
      f => f.flag_type === "black" && f.target_user_id === user?.id && !prevFlagIdsRef.current.has(f.id)
    );

    if (newTargetedBlackFlags.length > 0) {
      setBlackFlagReceivedAt(prev => {
        const updated = { ...prev };
        newTargetedBlackFlags.forEach(f => {
          if (!updated[f.id]) updated[f.id] = Date.now();
        });
        return updated;
      });
      // Vibrate for urgency
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    }

    // Clear accepted/dismissed state if the accepted flag is no longer in the raw flags list
    if (blackFlagAccepted && !currentIds.has(blackFlagAccepted)) {
      setBlackFlagAccepted(null);
    }
    // Clean up dismissed flags that are no longer present
    setBlackFlagDismissed(prev => {
      const cleaned = new Set<string>();
      for (const id of prev) {
        if (currentIds.has(id)) cleaned.add(id);
      }
      return cleaned.size !== prev.size ? cleaned : prev;
    });

    // Clean up old receivedAt entries
    setBlackFlagReceivedAt(prev => {
      const cleaned: Record<string, number> = {};
      for (const id of Object.keys(prev)) {
        if (currentIds.has(id)) cleaned[id] = prev[id];
      }
      return cleaned;
    });

    prevFlagIdsRef.current = currentIds;
  }, [activeFlags, user?.id, blackFlagAccepted]);

  // Separate targeted black flags from other flags for priority
  const targetedBlackFlag = useMemo(() => {
    return activeFlags.find(f => f.flag_type === "black" && f.target_user_id === user?.id) || null;
  }, [activeFlags, user?.id]);

  const globalBlackFlag = useMemo(() => {
    return activeFlags.find(f => f.flag_type === "black" && f.target_user_id === null) || null;
  }, [activeFlags]);

  const isTargetedBlackFlagAccepted = targetedBlackFlag && blackFlagAccepted === targetedBlackFlag.id;

  // Session timing (moved before primaryFlag so activeSession is available)
  const sessionStates = useMemo(() => {
    if (!eventDate) return [];
    const now = currentTime;
    const evDate = parseISO(eventDate + "T00:00:00");

    // Sort by sort_order to ensure correct sequence
    const orderedSessions = [...sessions].sort((a, b) => a.sort_order - b.sort_order);

    // Find the time-based active session
    let activeIdx = -1;
    let firstUpcomingIdx = -1;
    for (let i = 0; i < orderedSessions.length; i++) {
      const s = orderedSessions[i];
      if (s.start_time && s.duration_minutes) {
        const [h, m] = s.start_time.split(":").map(Number);
        const start = new Date(evDate); start.setHours(h, m, 0, 0);
        const end = addMinutes(start, s.duration_minutes);
        if (isAfter(now, start) && isBefore(now, end)) {
          activeIdx = i;
          break;
        }
        if (firstUpcomingIdx < 0 && isAfter(end, now)) {
          firstUpcomingIdx = i;
        }
      }
    }

    // Derive states from position relative to the active/first-upcoming session
    const pivotIdx = activeIdx >= 0 ? activeIdx : firstUpcomingIdx;
    return orderedSessions.map((s, i) => {
      if (activeIdx >= 0 && i === activeIdx) return { ...s, state: "active" as const };
      if (pivotIdx >= 0) {
        return { ...s, state: i < pivotIdx ? "completed" as const : "upcoming" as const };
      }
      return { ...s, state: "completed" as const };
    });
  }, [sessions, eventDate, currentTime]);

  const activeSession = sessionStates.find(s => s.state === "active");

  // Your session - based on user's run group registrations (supports multiple groups)
  // Placed before primaryFlag so synthetic green can use it
  const myActiveSession = useMemo(() => {
    if (userRegTypeIds.size === 0) return null;
    return sessionStates.find(s => s.state === "active" && sessionMatchesMyGroups(s)) || null;
  }, [sessionStates, userRegTypeIds, sessionMatchesMyGroups]);

  // Determine the highest-priority flag to display (excluding accepted targeted black flags)
  const priorityOrder = ["red", "black", "checkered", "yellow", "white", "green"];
  const primaryFlag = useMemo(() => {
    for (const type of priorityOrder) {
      const flag = priorityFlags.find(f => {
        if (f.flag_type !== type) return false;
        if (f.flag_type === "black" && f.target_user_id === user?.id && blackFlagAccepted === f.id) return false;
        return true;
      });
      if (flag) return flag;
    }
    const fallback = priorityFlags.find(f => {
      if (f.flag_type === "black" && f.target_user_id === user?.id && blackFlagAccepted === f.id) return false;
      return true;
    });
    if (fallback) return fallback;
    // If no flags remain and the user's selected group has an active session, show green
    // If user has no group selected, fall back to any active session
    const relevantActiveSession = userRegTypeIds.size > 0 ? myActiveSession : activeSession;
    if (relevantActiveSession) {
      return { id: "synthetic-green", flag_type: "green", message: null, target_user_id: null, is_active: true, created_at: "" } as EventFlag;
    }
    return null;
  }, [priorityFlags, blackFlagAccepted, user?.id, activeSession, myActiveSession, userRegTypeIds]);

  // Is the current primary flag a targeted black flag that needs the accept UI?
  const isTargetedBlackFlagFullScreen = primaryFlag?.flag_type === "black" && primaryFlag?.target_user_id === user?.id;
  const isGlobalBlackFlag = primaryFlag?.flag_type === "black" && primaryFlag?.target_user_id === null;

  // Countdown for accept button
  const acceptCountdown = useMemo(() => {
    if (!isTargetedBlackFlagFullScreen || !primaryFlag) return null;
    const receivedAt = blackFlagReceivedAt[primaryFlag.id];
    if (!receivedAt) return null;
    const elapsed = currentTime.getTime() - receivedAt;
    const remaining = BLACK_FLAG_LOCKOUT_MS - elapsed;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / 1000);
  }, [isTargetedBlackFlagFullScreen, primaryFlag, blackFlagReceivedAt, currentTime]);

  const canAcceptBlackFlag = acceptCountdown === 0;

  const handleAcceptBlackFlag = () => {
    if (primaryFlag && canAcceptBlackFlag) {
      setBlackFlagAccepted(primaryFlag.id);
      setBlackFlagAcceptedAt(Date.now());
      if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  // Auto-dismiss accepted black flag banner after 60 seconds
  const bannerTimeRemaining = useMemo(() => {
    if (!isTargetedBlackFlagAccepted || !blackFlagAcceptedAt) return null;
    const elapsed = currentTime.getTime() - blackFlagAcceptedAt;
    const remaining = 60000 - elapsed;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / 1000);
  }, [isTargetedBlackFlagAccepted, blackFlagAcceptedAt, currentTime]);

  // Clear accepted state and deactivate flag in DB when banner timer expires
  useEffect(() => {
    if (bannerTimeRemaining === 0 && blackFlagAccepted) {
      const flagIdToDeactivate = blackFlagAccepted;
      // Add to dismissed set FIRST so it stays filtered out of activeFlags
      setBlackFlagDismissed(prev => new Set(prev).add(flagIdToDeactivate));
      setBlackFlagAccepted(null);
      setBlackFlagAcceptedAt(null);
      // Deactivate the flag in the database so the organizer sees it cleared
      supabase
        .from("event_flags")
        .update({ is_active: false })
        .eq("id", flagIdToDeactivate)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to auto-clear black flag:", error);
          } else {
            console.log("Black flag auto-cleared after 60s post-accept");
          }
        });
    }
  }, [bannerTimeRemaining, blackFlagAccepted]);

  const activeRemaining = useMemo(() => {
    if (!activeSession?.start_time || !activeSession?.duration_minutes || !eventDate) return null;
    const evDate = parseISO(eventDate + "T00:00:00");
    const [h, m] = activeSession.start_time.split(":").map(Number);
    const start = new Date(evDate); start.setHours(h, m, 0, 0);
    const end = addMinutes(start, activeSession.duration_minutes);
    const diffMs = differenceInMilliseconds(end, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [activeSession, eventDate, currentTime]);

  const nextSession = useMemo(() => {
    // First upcoming session by sort_order (sessionStates is already sorted by sort_order)
    return sessionStates.find(s => s.state === "upcoming") || null;
  }, [sessionStates]);

  // myActiveSession is defined above (before primaryFlag)

  const myActiveRemaining = useMemo(() => {
    if (!myActiveSession?.start_time || !myActiveSession?.duration_minutes || !eventDate) return null;
    const evDate = parseISO(eventDate + "T00:00:00");
    const [h, m] = myActiveSession.start_time.split(":").map(Number);
    const start = new Date(evDate); start.setHours(h, m, 0, 0);
    const end = addMinutes(start, myActiveSession.duration_minutes);
    const diffMs = differenceInMilliseconds(end, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [myActiveSession, eventDate, currentTime]);

  const myNextSession = useMemo(() => {
    if (userRegTypeIds.size === 0) return null;
    return sessionStates.find(s => s.state === "upcoming" && sessionMatchesMyGroups(s)) || null;
  }, [sessionStates, userRegTypeIds, sessionMatchesMyGroups]);

  const myNextCountdown = useMemo(() => {
    if (!myNextSession?.start_time || !eventDate) return null;
    const evDate = parseISO(eventDate + "T00:00:00");
    const [h, m] = myNextSession.start_time.split(":").map(Number);
    const start = new Date(evDate); start.setHours(h, m, 0, 0);
    const diffMs = differenceInMilliseconds(start, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [myNextSession, eventDate, currentTime]);

  // --- Checkered flag auto-dismiss after 3 minutes ---
  const checkeredShownAtRef = useRef<number | null>(null);
  const [checkeredExpired, setCheckeredExpired] = useState(false);

  // Track when checkered first appears
  useEffect(() => {
    const rawFlag = priorityFlags.find(f => f.flag_type === "checkered");
    if (rawFlag) {
      if (checkeredShownAtRef.current === null) {
        checkeredShownAtRef.current = Date.now();
        setCheckeredExpired(false);
      }
    } else {
      checkeredShownAtRef.current = null;
      setCheckeredExpired(false);
    }
  }, [priorityFlags]);

  // Check expiry each tick
  useEffect(() => {
    if (checkeredShownAtRef.current && !checkeredExpired) {
      const elapsed = currentTime.getTime() - checkeredShownAtRef.current;
      if (elapsed >= 180000) {
        setCheckeredExpired(true);
      }
    }
  }, [currentTime, checkeredExpired]);

  // Effective primary flag: suppress checkered if expired
  const effectivePrimaryFlag = useMemo(() => {
    if (primaryFlag?.flag_type === "checkered" && checkeredExpired) {
      // Fall through to null (standby) — the synthetic green logic already returned null
      // if user's group isn't active, so we just suppress the checkered
      return null;
    }
    return primaryFlag;
  }, [primaryFlag, checkeredExpired]);

  const flagConfig = effectivePrimaryFlag ? FLAG_CONFIG[effectivePrimaryFlag.flag_type] || FLAG_CONFIG.green : null;
  const isCheckered = effectivePrimaryFlag?.flag_type === "checkered";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none">
      {/* Top bar — glassy with subtle red accent line */}
      <div className="relative flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-black/90 via-gray-950/90 to-black/90 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <Button variant="glass" size="icon" className="text-white/60 hover:text-white h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </Button>
        <span className="text-sm font-bold tracking-wide truncate max-w-[40%] text-white/90">{eventName}</span>
        <div className="flex items-center gap-2">
          {personalEventId && crewEnabled && (
            <Button
              variant="glass"
              size="icon"
              className="text-white/60 hover:text-white h-8 w-8"
              onClick={() => {
                const url = `${window.location.origin}/crew-live/${personalEventId}`;
                navigator.clipboard.writeText(url);
                toast({ title: "Crew link copied!", description: "Share this link with your crew member." });
              }}
              title="Copy crew link"
            >
              <Copy size={14} />
            </Button>
          )}
          {personalEventId && crewEnabled && (
            <Button
              variant="glass"
              size="icon"
              className="text-white/60 hover:text-white h-8 w-8"
              onClick={() => navigate(`/crew-live/${personalEventId}`)}
              title="Crew View"
            >
              <Users size={14} />
            </Button>
          )}
          {userCarNumber && (
            <Badge className="bg-primary/90 text-primary-foreground font-mono font-bold text-sm px-2.5 py-0.5 shadow-lg shadow-primary/30">
              #{userCarNumber}
            </Badge>
          )}
          <span className="text-sm font-mono text-white/50 tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Accepted targeted black flag banner */}
      {isTargetedBlackFlagAccepted && targetedBlackFlag && bannerTimeRemaining != null && bannerTimeRemaining > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-black via-red-950/40 to-black border-b-2 border-red-600 px-4 py-3 shrink-0 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-lg"
            >⚫</motion.span>
            <div>
              <p className="text-sm font-black text-red-500 uppercase tracking-wider">
                BLACK FLAG ACTIVE — PIT IN IMMEDIATELY
              </p>
              {targetedBlackFlag.message && (
                <p className="text-xs text-white/60 mt-0.5">{targetedBlackFlag.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/40">{bannerTimeRemaining}s</span>
            {userCarNumber && (
              <Badge className="bg-red-600 text-white font-mono font-bold text-sm shadow-lg shadow-red-600/40">
                #{userCarNumber}
              </Badge>
            )}
          </div>
        </motion.div>
      )}

      {/* Yellow by Turn banners */}
      {yellowTurnFlags.length > 0 && (
        <div className="shrink-0">
          {yellowTurnFlags.map(f => (
            <motion.div
              key={f.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 border-b border-yellow-600 px-4 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ scale: [1, 1.3, 1], rotate: [0, -5, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-lg"
                >
                  ⚠️
                </motion.span>
                <div>
                  <p className="text-sm font-black text-black uppercase tracking-wider">
                    LOCAL YELLOW
                  </p>
                  {f.message && (
                    <p className="text-xs text-black/70 font-semibold">{f.message}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-black/20 text-black font-bold text-xs border-0 backdrop-blur">
                CAUTION
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      {/* Blue flag banners */}
      {blueFlags.length > 0 && (
        <div className="shrink-0">
          {blueFlags.map(f => (
            <motion.div
              key={f.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 border-b border-blue-800 px-4 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-lg"
                >
                  🔵
                </motion.span>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-wider">
                    BLUE FLAG
                  </p>
                  {f.message && (
                    <p className="text-xs text-white/80 font-semibold">{f.message}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-white/20 text-white font-bold text-xs border-0 backdrop-blur">
                YIELD
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      {/* Flag Zone — dominant area */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {effectivePrimaryFlag && flagConfig ? (
            <motion.div
              key={effectivePrimaryFlag.id + effectivePrimaryFlag.flag_type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex-1 flex flex-col items-center justify-center p-6 ${flagConfig.bg} ${flagConfig.textColor} relative overflow-hidden`}
              style={isCheckered ? {
                backgroundImage: "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)",
                backgroundSize: "60px 60px",
              } : undefined}
            >
              {isCheckered && <div className="absolute inset-0 bg-black/40" />}
              
              {/* Subtle radial glow behind flag text */}
              {!isCheckered && effectivePrimaryFlag.flag_type !== "white" && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none" />
              )}
              
              <div className="relative z-10 text-center">
                {effectivePrimaryFlag.flag_type === "red" || effectivePrimaryFlag.flag_type === "black" ? (
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  >
                    <p className="text-6xl sm:text-8xl font-black tracking-widest mb-3 drop-shadow-lg">
                      {flagConfig.text}
                    </p>
                  </motion.div>
                ) : (
                  <p className="text-6xl sm:text-8xl font-black tracking-widest mb-3 drop-shadow-lg">
                    {flagConfig.text}
                  </p>
                )}
                <p className="text-xl sm:text-3xl font-bold uppercase tracking-wider opacity-90">
                  {flagConfig.label}
                </p>
                {effectivePrimaryFlag.message && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg sm:text-2xl mt-5 font-medium bg-black/30 backdrop-blur-sm rounded-xl px-5 py-2.5 inline-block shadow-lg"
                  >
                    {effectivePrimaryFlag.message}
                  </motion.p>
                )}

                {/* Targeted black flag: Accept button */}
                {isTargetedBlackFlagFullScreen && (
                  <div className="mt-8">
                    {canAcceptBlackFlag ? (
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Button
                          onClick={handleAcceptBlackFlag}
                          className="bg-red-600 hover:bg-red-700 text-white text-lg sm:text-xl font-black px-8 py-6 h-auto uppercase tracking-wider shadow-2xl shadow-red-600/50 rounded-xl"
                        >
                          ACKNOWLEDGE — PIT IN
                        </Button>
                      </motion.div>
                    ) : acceptCountdown !== null ? (
                      <Button
                        disabled
                        className="bg-white/10 text-white/40 text-lg sm:text-xl font-bold px-8 py-6 h-auto uppercase tracking-wider cursor-not-allowed rounded-xl"
                      >
                        Accept in {acceptCountdown}s...
                      </Button>
                    ) : null}
                  </div>
                )}

                {/* Global black flag */}
                {isGlobalBlackFlag && (
                  <p className="text-sm sm:text-lg mt-6 text-white/60 uppercase tracking-widest">
                    ALL DRIVERS — CANNOT BE DISMISSED
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-flag"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-6 relative overflow-hidden"
            >
              {/* Subtle racing texture on standby */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, white 20px, white 21px)"
              }} />
              
              <div className="relative z-10 flex flex-col items-center">
                {myNextSession ? (
                  <>
                    <p className="text-xs text-primary/60 uppercase tracking-[0.2em] font-bold mb-3">Your Next Session</p>
                    <p className="text-2xl sm:text-3xl font-black text-white/90 tracking-tight">{myNextSession.name}</p>
                    {regTypeName && <p className="text-xs text-white/30 mt-1 tracking-wide">{regTypeName}</p>}
                    {myNextCountdown ? (
                      <div className="mt-6 text-center">
                        <motion.p
                          className="text-5xl sm:text-6xl font-mono font-black text-blue-400 tabular-nums"
                          animate={myNextCountdown.minutes < 5 ? { textShadow: ["0 0 20px rgba(96,165,250,0.3)", "0 0 40px rgba(96,165,250,0.5)", "0 0 20px rgba(96,165,250,0.3)"] } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          {myNextCountdown.minutes}:{myNextCountdown.seconds.toString().padStart(2, "0")}
                        </motion.p>
                        <p className="text-xs text-blue-300/50 uppercase tracking-[0.15em] mt-2 font-medium">until start</p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/30 mt-4">Starting soon...</p>
                    )}
                  </>
                ) : userRegTypeIds.size > 0 && sessionStates.every(s => s.state === "completed") ? (
                  <div className="flex flex-col items-center justify-center text-center w-full">
                    <motion.p
                      className="text-3xl sm:text-5xl font-black text-white/20 uppercase tracking-widest"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      🏁 All Sessions Complete
                    </motion.p>
                    <p className="text-sm text-white/15 mt-3 tracking-wide">Great day on track!</p>
                  </div>
                ) : (
                  <>
                    <motion.div
                      animate={{ opacity: [0.2, 0.4, 0.2] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center mb-4"
                    >
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                    </motion.div>
                    <p className="text-2xl sm:text-4xl font-black text-white/20 uppercase tracking-widest">
                      Standby
                    </p>
                    <p className="text-sm text-white/15 mt-2 tracking-wide">Waiting for flag updates...</p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Your Session Banner — personalized to racer's run group */}
        {userRegTypeIds.size > 0 && (myActiveSession || myNextSession) && (
          <div className={`border-t shrink-0 ${myActiveSession ? 'bg-gradient-to-r from-green-950/80 via-green-900/60 to-green-950/80 border-green-500/20' : 'bg-gradient-to-r from-blue-950/60 via-blue-900/40 to-blue-950/60 border-blue-500/15'}`}>
            <div className="px-4 py-3">
              {myActiveSession && myActiveRemaining ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-green-400 uppercase tracking-[0.15em] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block shadow-lg shadow-green-400/50" />
                      YOUR SESSION — ON TRACK
                    </p>
                    <p className="text-sm font-bold text-white mt-1">{myActiveSession.name}</p>
                    {regTypeName && <p className="text-[10px] text-white/40 mt-0.5">{regTypeName}</p>}
                  </div>
                  <div className="text-right">
                    <motion.p
                      key={myActiveRemaining.minutes}
                      className="text-4xl font-mono font-black text-green-400 tabular-nums"
                      style={{ textShadow: "0 0 20px rgba(74,222,128,0.3)" }}
                      animate={myActiveRemaining.minutes < 2 ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      {myActiveRemaining.minutes}:{myActiveRemaining.seconds.toString().padStart(2, "0")}
                    </motion.p>
                    <p className="text-[10px] text-green-400/50 uppercase tracking-wider">remaining</p>
                  </div>
                </div>
              ) : myNextSession && myNextCountdown ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-300 uppercase tracking-[0.15em] font-bold">YOUR NEXT SESSION</p>
                    <p className="text-sm font-bold text-white mt-1">{myNextSession.name}</p>
                    {regTypeName && <p className="text-[10px] text-white/40 mt-0.5">{regTypeName}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-blue-400 tabular-nums">
                      {myNextCountdown.minutes}:{myNextCountdown.seconds.toString().padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-blue-300/50 uppercase tracking-wider">until start</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Global Session Info Bar */}
        {userRegTypeIds.size === 0 && (
          <div className="bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900 border-t border-white/5 px-4 py-3 shrink-0">
            {activeSession ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">Current Track Session</p>
                  <p className="text-sm font-bold mt-0.5">{activeSession.name}</p>
                </div>
                {activeRemaining && (
                  <p className="text-xl font-mono font-bold text-green-400 tabular-nums" style={{ textShadow: "0 0 15px rgba(74,222,128,0.2)" }}>
                    {activeRemaining.minutes}:{activeRemaining.seconds.toString().padStart(2, "0")}
                  </p>
                )}
              </div>
            ) : nextSession ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">Up Next</p>
                  <p className="text-sm font-bold mt-0.5">{nextSession.name}</p>
                </div>
                <p className="text-sm text-white/40">Starts at {nextSession.start_time}</p>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center">No active sessions</p>
            )}
          </div>
        )}


        {/* Driver Communication Panels */}
        {personalEventId && crewEnabled && (
          <div className="bg-gradient-to-b from-gray-950 to-black border-t border-white/5 shrink-0">
            {/* Track Notes + Gap Ahead */}
            <div className="grid grid-cols-2 gap-3 p-3">
              {/* Track Notes */}
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-amber-900/5 p-5 h-[35vh] flex flex-col shadow-lg shadow-amber-900/10 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <StickyNote size={18} className="text-amber-400" />
                    <p className="text-xs uppercase tracking-[0.15em] text-amber-300/60 font-bold">Track Notes</p>
                  </div>
                  {!isEditingNotes && (
                    <button className="text-white/20 hover:text-amber-400 transition-colors" onClick={() => { setNotesDraft(trackNotes); setIsEditingNotes(true); }}>
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                    <textarea
                      autoFocus
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full flex-1 bg-black/50 border border-amber-500/20 rounded-xl p-3 text-base text-white resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/40 placeholder:text-white/20"
                      rows={5}
                      placeholder="Braking points, turn notes..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button className="text-white/30 hover:text-white/60 transition-colors" onClick={() => setIsEditingNotes(false)}><X size={16} /></button>
                      <button className="text-green-400 hover:text-green-300 transition-colors" onClick={saveTrackNotes}><Check size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="text-base sm:text-lg text-white/70 whitespace-pre-wrap leading-relaxed flex-1 overflow-y-auto">
                    {trackNotes || <span className="text-white/20 italic">Tap edit to add...</span>}
                  </div>
                )}
              </div>

              {/* Interchangeable Right Card */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 p-5 h-[35vh] flex flex-col items-center justify-center shadow-lg shadow-primary/10 relative overflow-hidden">
                {/* Card Switcher */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {([
                    { key: 'gap' as const, icon: TrendingUp },
                    { key: 'map' as const, icon: Map },
                    { key: 'lap' as const, icon: Timer },
                  ]).map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => { setRightCard(key); localStorage.setItem(`right-card-${eventId}`, key); }}
                      className={`p-1.5 rounded-lg transition-all ${rightCard === key ? 'bg-primary/30 text-primary' : 'text-white/20 hover:text-white/40'}`}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>

                {/* Gap Ahead */}
                {rightCard === 'gap' && (
                  <>
                    <TrendingUp size={28} className="text-primary/70 mb-3" />
                    <p className="text-6xl sm:text-7xl font-black text-white tabular-nums tracking-tight" style={{ textShadow: latestGap ? "0 0 30px hsl(var(--primary) / 0.3)" : "none" }}>
                      {latestGap || "—"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/30 mt-3 font-medium">Gap Ahead</p>
                  </>
                )}

                {/* Track Map */}
                {rightCard === 'map' && (
                  <div className="flex flex-col items-center justify-center flex-1 w-full">
                    <input ref={trackMapInputRef} type="file" accept="image/*" className="hidden" onChange={handleTrackMapUpload} />
                    {trackMapUrl ? (
                      <>
                        <img src={trackMapUrl} alt="Track map" className="w-full flex-1 min-h-[20vh] max-h-[30vh] object-contain rounded-xl" />
                        <button
                          onClick={() => trackMapInputRef.current?.click()}
                          className="text-[10px] text-white/30 hover:text-white/50 mt-2 transition-colors"
                        >
                          Replace map
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => trackMapInputRef.current?.click()}
                        disabled={trackMapUploading}
                        className="w-full flex-1 min-h-[20vh] rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        {trackMapUploading ? (
                          <Loader2 size={24} className="text-white/30 animate-spin" />
                        ) : (
                          <>
                            <Upload size={24} className="text-white/20" />
                            <p className="text-sm text-white/20 italic">Tap to upload track map</p>
                          </>
                        )}
                      </button>
                    )}
                    <p className="text-xs uppercase tracking-[0.15em] text-white/30 mt-3 font-medium">Track Map</p>
                  </div>
                )}

                {/* Fastest Lap */}
                {rightCard === 'lap' && (
                  <>
                    <Timer size={28} className="text-primary/70 mb-3" />
                    <p className="text-6xl sm:text-7xl font-black text-white tabular-nums tracking-tight">
                      —
                    </p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/30 mt-3 font-medium">Fastest Lap</p>
                  </>
                )}
              </div>
            </div>

            {/* Latest Crew Message */}
            {latestCrewMessage && (
              <div className="mx-3 mb-2 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-2.5 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.15em] text-primary/70 font-bold mb-0.5">Latest from Crew</p>
                <p className="text-sm font-semibold text-white">{latestCrewMessage}</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default RacerLiveView;
