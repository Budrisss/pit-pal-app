import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { parseISO, addMinutes, differenceInMilliseconds, isAfter, isBefore } from "date-fns";
import { ArrowLeft, Volume2 } from "lucide-react";
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
}

const FLAG_CONFIG: Record<string, { bg: string; text: string; label: string; textColor: string }> = {
  green: { bg: "bg-green-500", text: "GREEN", label: "Track Clear", textColor: "text-white" },
  yellow: { bg: "bg-yellow-400", text: "YELLOW", label: "CAUTION", textColor: "text-black" },
  red: { bg: "bg-red-600", text: "RED", label: "STOP — SESSION HALTED", textColor: "text-white" },
  black: { bg: "bg-black", text: "BLACK FLAG", label: "PIT IN IMMEDIATELY", textColor: "text-white" },
  white: { bg: "bg-white border-2 border-gray-300", text: "WHITE", label: "Slow Vehicle Ahead", textColor: "text-black" },
  checkered: { bg: "bg-black", text: "🏁", label: "SESSION OVER", textColor: "text-white" },
};

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
  const [userRegTypeId, setUserRegTypeId] = useState<string | null>(null);
  const [regTypeName, setRegTypeName] = useState<string | null>(null);
  const [userCarNumber, setUserCarNumber] = useState<number | null>(null);

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

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const [eventRes, sessRes, flagRes, annRes, regRes] = await Promise.all([
      supabase.from("public_events").select("name, date").eq("id", eventId).single(),
      supabase.from("public_event_sessions").select("*").eq("event_id", eventId).order("sort_order"),
      supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", true),
      supabase.from("event_announcements").select("id, message, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(10),
      user ? supabase.from("event_registrations").select("registration_type_id, car_number").eq("event_id", eventId).eq("user_id", user.id).limit(1) : Promise.resolve({ data: null }),
    ]);
    if (eventRes.data) {
      setEventName(eventRes.data.name);
      setEventDate(eventRes.data.date);
    }
    setSessions((sessRes.data as EventSession[]) || []);
    setFlags((flagRes.data as EventFlag[]) || []);
    setAnnouncements((annRes.data as Announcement[]) || []);
    if (regRes.data && regRes.data.length > 0) {
      const reg = regRes.data[0] as any;
      const rtId = reg.registration_type_id;
      setUserRegTypeId(rtId);
      setUserCarNumber(reg.car_number || null);
      const { data: rtData } = await supabase.from("registration_types").select("name").eq("id", rtId).single();
      if (rtData) setRegTypeName(rtData.name);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`racer-live-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_flags", filter: `event_id=eq.${eventId}` }, () => {
        supabase.from("event_flags").select("*").eq("event_id", eventId).eq("is_active", true)
          .then(({ data }) => {
            if (data) {
              setFlags(data as EventFlag[]);
            }
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

  // Active flags for this user
  const activeFlags = useMemo(() => {
    return flags.filter(f => f.is_active && (!f.target_user_id || f.target_user_id === user?.id));
  }, [flags, user?.id]);

  // Determine the highest-priority flag to display
  const priorityOrder = ["red", "black", "checkered", "yellow", "white", "green"];
  const primaryFlag = useMemo(() => {
    for (const type of priorityOrder) {
      const flag = activeFlags.find(f => f.flag_type === type);
      if (flag) return flag;
    }
    return activeFlags[0] || null;
  }, [activeFlags]);

  // Session timing
  const sessionStates = useMemo(() => {
    if (!eventDate) return [];
    const now = currentTime;
    const evDate = parseISO(eventDate);
    return sessions.map(s => {
      if (!s.start_time || !s.duration_minutes) return { ...s, state: "upcoming" as const };
      const [h, m] = s.start_time.split(":").map(Number);
      const start = new Date(evDate); start.setHours(h, m, 0, 0);
      const end = addMinutes(start, s.duration_minutes);
      if (isAfter(now, end)) return { ...s, state: "completed" as const };
      if (isAfter(now, start) && isBefore(now, end)) return { ...s, state: "active" as const };
      return { ...s, state: "upcoming" as const };
    });
  }, [sessions, eventDate, currentTime]);

  const activeSession = sessionStates.find(s => s.state === "active");
  const activeRemaining = useMemo(() => {
    if (!activeSession?.start_time || !activeSession?.duration_minutes || !eventDate) return null;
    const evDate = parseISO(eventDate);
    const [h, m] = activeSession.start_time.split(":").map(Number);
    const start = new Date(evDate); start.setHours(h, m, 0, 0);
    const end = addMinutes(start, activeSession.duration_minutes);
    const diffMs = differenceInMilliseconds(end, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [activeSession, eventDate, currentTime]);

  const nextSession = useMemo(() => {
    const upcoming = sessionStates.filter(s => s.state === "upcoming" && s.start_time);
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => {
      const [ah, am] = a.start_time!.split(":").map(Number);
      const [bh, bm] = b.start_time!.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    })[0];
  }, [sessionStates]);

  // Your session - based on user's run group registration
  const myActiveSession = useMemo(() => {
    if (!userRegTypeId) return null;
    return sessionStates.find(s => s.state === "active" && s.registration_type_id === userRegTypeId) || null;
  }, [sessionStates, userRegTypeId]);

  const myActiveRemaining = useMemo(() => {
    if (!myActiveSession?.start_time || !myActiveSession?.duration_minutes || !eventDate) return null;
    const evDate = parseISO(eventDate);
    const [h, m] = myActiveSession.start_time.split(":").map(Number);
    const start = new Date(evDate); start.setHours(h, m, 0, 0);
    const end = addMinutes(start, myActiveSession.duration_minutes);
    const diffMs = differenceInMilliseconds(end, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [myActiveSession, eventDate, currentTime]);

  const myNextSession = useMemo(() => {
    if (!userRegTypeId) return null;
    const upcoming = sessionStates.filter(s => s.state === "upcoming" && s.start_time && s.registration_type_id === userRegTypeId);
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => {
      const [ah, am] = a.start_time!.split(":").map(Number);
      const [bh, bm] = b.start_time!.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    })[0];
  }, [sessionStates, userRegTypeId]);

  const myNextCountdown = useMemo(() => {
    if (!myNextSession?.start_time || !eventDate) return null;
    const evDate = parseISO(eventDate);
    const [h, m] = myNextSession.start_time.split(":").map(Number);
    const start = new Date(evDate); start.setHours(h, m, 0, 0);
    const diffMs = differenceInMilliseconds(start, currentTime);
    if (diffMs <= 0) return null;
    return { minutes: Math.floor(diffMs / 60000), seconds: Math.floor((diffMs % 60000) / 1000) };
  }, [myNextSession, eventDate, currentTime]);

  const flagConfig = primaryFlag ? FLAG_CONFIG[primaryFlag.flag_type] || FLAG_CONFIG.green : null;
  const isCheckered = primaryFlag?.flag_type === "checkered";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </Button>
        <span className="text-sm font-semibold truncate max-w-[40%]">{eventName}</span>
        <div className="flex items-center gap-2">
          {userCarNumber && (
            <Badge className="bg-primary text-primary-foreground font-mono font-bold text-sm px-2 py-0.5">
              #{userCarNumber}
            </Badge>
          )}
          <span className="text-sm font-mono text-white/60">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Flag Zone - dominant area */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {primaryFlag && flagConfig ? (
            <motion.div
              key={primaryFlag.id + primaryFlag.flag_type}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex-1 flex flex-col items-center justify-center p-6 ${flagConfig.bg} ${flagConfig.textColor} relative overflow-hidden`}
              style={isCheckered ? {
                backgroundImage: "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)",
                backgroundSize: "60px 60px",
              } : undefined}
            >
              {isCheckered && <div className="absolute inset-0 bg-black/40" />}
              <div className="relative z-10 text-center">
                {primaryFlag.flag_type === "red" || primaryFlag.flag_type === "black" ? (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <p className="text-5xl sm:text-7xl font-black tracking-widest mb-2">
                      {flagConfig.text}
                    </p>
                  </motion.div>
                ) : (
                  <p className="text-5xl sm:text-7xl font-black tracking-widest mb-2">
                    {flagConfig.text}
                  </p>
                )}
                <p className="text-xl sm:text-3xl font-bold uppercase tracking-wide">
                  {flagConfig.label}
                </p>
                {primaryFlag.message && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg sm:text-2xl mt-4 font-medium bg-black/30 rounded-lg px-4 py-2 inline-block"
                  >
                    {primaryFlag.message}
                  </motion.p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-flag"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center bg-gray-900 p-6"
            >
              <p className="text-2xl sm:text-4xl font-bold text-white/30 uppercase tracking-widest">
                Standby
              </p>
              <p className="text-sm text-white/20 mt-2">Waiting for flag updates...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Your Session Banner - personalized to racer's run group */}
        {userRegTypeId && (myActiveSession || myNextSession) && (
          <div className={`border-t border-white/10 px-4 py-3 shrink-0 ${myActiveSession ? 'bg-green-900/60' : 'bg-blue-900/40'}`}>
            {myActiveSession && myActiveRemaining ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-green-300 uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                    YOUR SESSION — ON TRACK
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5">{myActiveSession.name}</p>
                  {regTypeName && <p className="text-[10px] text-white/50">{regTypeName}</p>}
                </div>
                <div className="text-right">
                  <motion.p
                    key={myActiveRemaining.minutes}
                    className="text-4xl font-mono font-black text-green-400"
                    animate={myActiveRemaining.minutes < 2 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    {myActiveRemaining.minutes}:{myActiveRemaining.seconds.toString().padStart(2, "0")}
                  </motion.p>
                  <p className="text-[10px] text-green-300/60 uppercase tracking-wider">remaining</p>
                </div>
              </div>
            ) : myNextSession && myNextCountdown ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">YOUR NEXT SESSION</p>
                  <p className="text-sm font-bold text-white mt-0.5">{myNextSession.name}</p>
                  {regTypeName && <p className="text-[10px] text-white/50">{regTypeName}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-blue-400">
                    {myNextCountdown.minutes}:{myNextCountdown.seconds.toString().padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-blue-300/60 uppercase tracking-wider">until start</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Global Session Info Bar */}
        <div className="bg-gray-900 border-t border-white/10 px-4 py-2.5 shrink-0">
          {activeSession ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Current Track Session</p>
                <p className="text-sm font-bold">{activeSession.name}</p>
              </div>
              {activeRemaining && (
                <p className="text-xl font-mono font-bold text-green-400">
                  {activeRemaining.minutes}:{activeRemaining.seconds.toString().padStart(2, "0")}
                </p>
              )}
            </div>
          ) : nextSession ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Up Next</p>
                <p className="text-sm font-bold">{nextSession.name}</p>
              </div>
              <p className="text-sm text-white/40">Starts at {nextSession.start_time}</p>
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center">No active sessions</p>
          )}
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="bg-gray-950 border-t border-white/10 px-4 py-3 shrink-0 max-h-40 overflow-y-auto">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Volume2 size={10} /> Announcements
            </p>
            <div className="space-y-1.5">
              {announcements.slice(0, 5).map(a => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-white/70 bg-white/5 rounded px-3 py-1.5"
                >
                  {a.message}
                  <span className="text-[10px] text-white/30 ml-2">
                    {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RacerLiveView;
