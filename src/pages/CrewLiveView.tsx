import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Clock, TrendingUp, MessageSquare, Flag, Radio, ClipboardList, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { addMinutes, differenceInMilliseconds, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { getCrewTransport, FailoverTransport, type Transport } from "@/lib/transport";
import { useSimConfig } from "@/hooks/useSimStore";

interface CrewMessage {
  id: string;
  event_id: string;
  user_id: string;
  session_id: string | null;
  gap_ahead: string | null;
  position: string | null;
  time_remaining: string | null;
  message: string | null;
  created_at: string;
}

const JUST_ENDED_WINDOW_MS = 60_000;

/** Single row of the Pit Board editor. Defined outside the main render so the
 *  input doesn't lose focus on every keystroke. */
interface PitRowProps {
  label: string;
  current: string | null;
  draft: string;
  setDraft: (v: string) => void;
  placeholder: string;
  isSending: boolean;
  disabledSend: boolean;
  onSend: () => void;
  onClear: () => void;
  big?: boolean;
}
const PitRow = ({
  label,
  current,
  draft,
  setDraft,
  placeholder,
  isSending,
  disabledSend,
  onSend,
  onClear,
  big,
}: PitRowProps) => (
  <div className="px-4 py-3 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300/40 font-bold">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`font-black text-amber-100 tabular-nums tracking-tight leading-none truncate text-right ${
            big ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
          }`}
          style={{ textShadow: current ? "0 0 18px hsl(45 100% 55% / 0.45)" : "none" }}
        >
          {current || "—"}
        </span>
        {current && (
          <button
            onClick={onClear}
            disabled={disabledSend}
            className="text-amber-300/40 hover:text-amber-300 transition-colors disabled:opacity-30"
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm bg-black/40 border-amber-500/20 text-amber-100 placeholder:text-amber-300/30 focus-visible:ring-amber-500/40"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button
        variant="orange"
        className="h-9 px-3 shrink-0"
        onClick={onSend}
        disabled={disabledSend || !draft.trim()}
      >
        {isSending ? "…" : <Send size={14} />}
      </Button>
    </div>
  </div>
);

const CrewLiveView = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { getEventById } = useEvents();
  const { toast } = useToast();

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [sessions, setSessions] = useState<{ name: string; start_time: string | null; duration: number | null }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [posDraft, setPosDraft] = useState("");
  const [msgDraft, setMsgDraft] = useState("");
  const [gapDraft, setGapDraft] = useState("");
  const [sendingField, setSendingField] = useState<"pos" | "msg" | "gap" | null>(null);
  const [sending, setSending] = useState(false);
  const [crewEnabled, setCrewEnabled] = useState<boolean | null>(null); // null = loading
  const [eventOwnerUserId, setEventOwnerUserId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use RPC-provided event info; fall back to context for personal events
  const eventFromContext = getEventById(eventId || "");
  const resolvedEventName = eventName || eventFromContext?.name || null;
  const eventBaseDate = eventDate || (eventFromContext?.eventDate ? new Date(eventFromContext.eventDate) : null);

  // Parse personal-event sessions from localStorage
  const parseLocalSessions = useCallback((eid: string) => {
    const saved = localStorage.getItem(`sessions-${eid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          name: s.referenceName || s.name,
          start_time: s.startTime || s.start_time || null,
          duration: s.duration || null,
        }));
      } catch { /* skip */ }
    }
    return null;
  }, []);

  // Load sessions + check crew_enabled using RPC (works for any authenticated user)
  useEffect(() => {
    if (!eventId || !user || loading) return;
    const loadSessions = async () => {
      // Use security definer function to get event info (bypasses events RLS)
      const { data: rpcData } = await supabase.rpc('get_crew_event_info', { p_event_id: eventId });
      const eventRow = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (eventRow) {
        setEventOwnerUserId(eventRow.event_user_id);
        setEventName(eventRow.event_name);
        if (eventRow.event_date) setEventDate(new Date(eventRow.event_date));

        if (eventRow.public_event_id) {
          // Check if crew_enabled for this event's owner
          const { data: regData } = await (supabase as any)
            .from("event_registrations")
            .select("crew_enabled")
            .eq("event_id", eventRow.public_event_id)
            .eq("user_id", eventRow.event_user_id)
            .limit(1);
          const enabled = regData && regData.length > 0 ? regData[0].crew_enabled : false;
          setCrewEnabled(enabled);

          const { data } = await (supabase as any)
            .from("public_event_sessions")
            .select("name, start_time, duration_minutes")
            .eq("event_id", eventRow.public_event_id)
            .order("sort_order", { ascending: true });
          if (data) {
            setSessions(data.map((s: any) => ({
              name: s.name,
              start_time: s.start_time || null,
              duration: s.duration_minutes || null,
            })));
          }
        } else {
          // Personal event — crew is always enabled
          setCrewEnabled(true);
          const localSessions = parseLocalSessions(eventId);
          if (localSessions) setSessions(localSessions);
        }
      }
    };
    loadSessions();
  }, [eventId, user, loading, parseLocalSessions]);

  // Listen for localStorage changes (cross-tab + same-tab polling)
  useEffect(() => {
    if (!eventId) return;
    const storageKey = `sessions-${eventId}`;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const updated = parseLocalSessions(eventId);
        if (updated) setSessions(updated);
      }
    };
    window.addEventListener("storage", handleStorage);

    let lastValue = localStorage.getItem(storageKey);
    const poll = setInterval(() => {
      const current = localStorage.getItem(storageKey);
      if (current !== lastValue) {
        lastValue = current;
        const updated = parseLocalSessions(eventId);
        if (updated) setSessions(updated);
      }
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(poll);
    };
  }, [eventId, parseLocalSessions]);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute active session, just-ended, next session
  const { activeSessionInfo, justEndedSession, nextSessionCountdown } = (() => {
    let active: { name: string | null; minutes: number | null; seconds: number | null; label: string; progress: number | null } | null = null;
    let justEnded: { name: string } | null = null;
    let nextSession: { name: string; label: string } | null = null;

    if (eventBaseDate && !Number.isNaN(eventBaseDate.getTime()) && sessions.length) {
      let earliestUpcoming: { name: string; diffMs: number } | null = null;

      for (const s of sessions) {
        if (!s.start_time || !s.duration) continue;
        try {
          const [h, m] = s.start_time.split(':').map(Number);
          const start = new Date(eventBaseDate);
          start.setHours(h, m, 0, 0);
          const end = addMinutes(start, s.duration);

          if (currentTime >= start && currentTime < end) {
            const diff = differenceInMilliseconds(end, currentTime);
            const totalMs = s.duration * 60 * 1000;
            const elapsedMs = totalMs - diff;
            active = {
              name: s.name,
              minutes: Math.floor(diff / (1000 * 60)),
              seconds: Math.floor((diff % (1000 * 60)) / 1000),
              label: `${Math.floor(diff / (1000 * 60))}:${Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0')}`,
              progress: Math.min(1, Math.max(0, elapsedMs / totalMs)),
            };
          }

          const msSinceEnd = currentTime.getTime() - end.getTime();
          if (msSinceEnd >= 0 && msSinceEnd < JUST_ENDED_WINDOW_MS) {
            justEnded = { name: s.name };
          }

          const diffToStart = start.getTime() - currentTime.getTime();
          if (diffToStart > 0 && (!earliestUpcoming || diffToStart < earliestUpcoming.diffMs)) {
            earliestUpcoming = { name: s.name, diffMs: diffToStart };
          }
        } catch { /* skip */ }
      }

      if (earliestUpcoming) {
        const d = earliestUpcoming.diffMs;
        const hrs = Math.floor(d / (1000 * 60 * 60));
        const mins = Math.floor((d % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((d % (1000 * 60)) / 1000);
        const label = hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
        nextSession = { name: earliestUpcoming.name, label };
      }
    }

    return { activeSessionInfo: active, justEndedSession: justEnded, nextSessionCountdown: nextSession };
  })();

  // Load existing messages + subscribe to realtime
  useEffect(() => {
    if (!eventId || !user || loading) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("crew_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (data) setMessages(data as CrewMessage[]);
    };
    loadMessages();

    const channel = supabase
      .channel(`crew-messages-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crew_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          setMessages((prev) => [payload.new as CrewMessage, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, user, loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [messages.length]);

  // Transport: created lazily per (eventId, userId). Falls back to direct Supabase when sim flag off.
  const { enabled: simEnabled } = useSimConfig();
  const transportRef = useRef<Transport | null>(null);
  const [activeLeg, setActiveLeg] = useState<"supabase" | "lora-sim" | "lora-hw" | null>(null);

  useEffect(() => {
    if (!eventId || !user) return;
    transportRef.current?.destroy?.();
    const t = getCrewTransport({ eventId, userId: user.id });
    transportRef.current = t;
    if (t instanceof FailoverTransport) {
      const update = () => setActiveLeg(t.getActive() as "supabase" | "lora-sim" | "lora-hw");
      update();
      const off = t.onStatusChange(update);
      return () => { off(); t.destroy?.(); transportRef.current = null; };
    } else {
      setActiveLeg(null);
      return () => { t.destroy?.(); transportRef.current = null; };
    }
  }, [eventId, user, simEnabled]);

  const sendPit = async (field: "pos" | "msg" | "gap", value: string) => {
    if (!eventId || !user) return;
    const v = value.trim();
    if (!v) return;
    setSendingField(field);
    setSending(true);
    try {
      await transportRef.current!.send({ t: field, v, ts: Date.now(), from: user.id });
      if (field === "pos") setPosDraft("");
      else if (field === "msg") setMsgDraft("");
      else setGapDraft("");
    } catch (error) {
      toast({ title: "Failed to send", description: (error as Error).message, variant: "destructive" });
    }
    setSending(false);
    setSendingField(null);
  };

  // Current values displayed on the racer's pit board (latest non-empty per field)
  const fmtGap = (g: string) => {
    const t = g.trim();
    if (!t) return "";
    if (/^[+-]/.test(t)) return t;
    if (/^\d/.test(t)) return `+${t}`;
    return t.toUpperCase();
  };
  const fmtPos = (p: string) => {
    const t = p.trim();
    if (!t) return "";
    return /^\d+$/.test(t) ? `P${t}` : t.toUpperCase();
  };
  const currentPos = useMemo(() => {
    const f = [...messages].find((m) => m.position && m.position.trim());
    return f ? fmtPos(f.position!) : null;
  }, [messages]);
  const currentMsg = useMemo(() => {
    const f = [...messages].find((m) => m.message && m.message.trim());
    return f ? f.message!.trim().toUpperCase() : null;
  }, [messages]);
  const currentGap = useMemo(() => {
    const f = [...messages].find((m) => m.gap_ahead && m.gap_ahead.trim());
    return f ? fmtGap(f.gap_ahead!) : null;
  }, [messages]);

  const sendClear = (field: "pos" | "msg" | "gap") => sendPit(field, "—");

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), "h:mm:ss a"); } catch { return ts; }
  };

  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Crew View</h1>
            <p className="text-sm text-muted-foreground truncate">{resolvedEventName || "Event"}</p>
          </div>
          {simEnabled && (activeLeg === "lora-sim" || activeLeg === "lora-hw") && (
            <Badge variant="outline" className="text-xs px-2 py-1 border-yellow-500/60 text-yellow-400 font-semibold">
              <Radio size={11} className="mr-1" /> LoRa
            </Badge>
          )}
          <Badge variant="outline" className="text-sm px-3 py-1 animate-pulse border-green-500 text-green-500 font-semibold">
            ● LIVE
          </Badge>
        </div>

        {/* Crew not enabled message */}
        {crewEnabled === false && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-5 py-6 text-center">
            <MessageSquare size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">Crew Messaging Not Enabled</p>
            <p className="text-xs text-muted-foreground">The event organizer has not enabled crew messaging for this driver yet.</p>
          </div>
        )}

        {/* Active Session Timer */}
        {crewEnabled && activeSessionInfo && (
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 backdrop-blur-sm px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-green-500 font-semibold">
                  {activeSessionInfo.name ? "Session Active" : "Time Remaining"}
                </p>
                {activeSessionInfo.name && (
                  <p className="text-sm font-medium text-foreground">{activeSessionInfo.name}</p>
                )}
              </div>
              <p className="text-3xl sm:text-4xl font-black text-green-400 tabular-nums">
                {activeSessionInfo.label}
              </p>
            </div>
            {activeSessionInfo.progress !== null && (
              <div className="mt-3 h-2 w-full rounded-full bg-green-500/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${activeSessionInfo.progress * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {crewEnabled && <>
        {/* Checkered Flag — Session Just Ended */}
        {!activeSessionInfo && justEndedSession && (
          <div className="rounded-xl border-2 border-yellow-500/60 bg-yellow-500/10 backdrop-blur-sm px-5 py-5 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 text-4xl">🏁</div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-yellow-500 font-bold mb-1">
                  Session Complete
                </p>
                <p className="text-xl sm:text-2xl font-black text-foreground">
                  Come to Pits
                </p>
                {justEndedSession.name && (
                  <p className="text-sm text-muted-foreground mt-0.5">{justEndedSession.name} has ended</p>
                )}
              </div>
              <Flag size={32} className="text-yellow-500 flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Next Session Countdown */}
        {!activeSessionInfo && !justEndedSession && nextSessionCountdown && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-5 py-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Next Session
                </p>
                <p className="text-sm font-medium text-foreground">{nextSessionCountdown.name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
                  {nextSessionCountdown.label}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">until start</p>
              </div>
            </div>
          </div>
        )}

        {/* Pit Board Editor — mirrors racer's display */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-black to-amber-950/40 shadow-[0_0_40px_-10px_hsl(45_100%_55%_/_0.35)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-amber-500/20 bg-black/40">
            <div className="flex items-center gap-1.5">
              <ClipboardList size={16} className="text-amber-400" />
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">Pit Board</p>
            </div>
            {activeSessionInfo?.name && (
              <span className="text-[10px] text-amber-300/50 truncate max-w-[60%]">{activeSessionInfo.name}</span>
            )}
          </div>

          <div className="divide-y-2 divide-amber-500/15">
            {/* POSITION */}
            <PitRow
              label="Pos"
              current={currentPos}
              draft={posDraft}
              setDraft={setPosDraft}
              placeholder="2"
              isSending={sendingField === "pos"}
              disabledSend={sending}
              onSend={() => sendPit("pos", posDraft)}
              onClear={() => sendClear("pos")}
              big
            />
            {/* MESSAGE */}
            <PitRow
              label="Msg"
              current={currentMsg}
              draft={msgDraft}
              setDraft={setMsgDraft}
              placeholder="PIT IN"
              isSending={sendingField === "msg"}
              disabledSend={sending}
              onSend={() => sendPit("msg", msgDraft)}
              onClear={() => sendClear("msg")}
            />
            {/* GAP */}
            <PitRow
              label="Gap"
              current={currentGap}
              draft={gapDraft}
              setDraft={setGapDraft}
              placeholder="+1.2"
              isSending={sendingField === "gap"}
              disabledSend={sending}
              onSend={() => sendPit("gap", gapDraft)}
              onClear={() => sendClear("gap")}
              big
            />
          </div>
        </div>

        {/* Message History */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Message History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]" ref={scrollRef}>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-lg bg-background/50 border border-border/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                        {msg.gap_ahead && <Badge variant="secondary" className="text-xs">Gap: {msg.gap_ahead}</Badge>}
                        {msg.position && <Badge variant="secondary" className="text-xs">{msg.position}</Badge>}
                        {msg.time_remaining && <Badge variant="secondary" className="text-xs"><Clock size={10} className="mr-1" />{msg.time_remaining}</Badge>}
                      </div>
                      {msg.message && <p className="text-sm text-foreground">{msg.message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </>}
      </div>
      <Navigation />
    </div>
  );
};

export default CrewLiveView;
