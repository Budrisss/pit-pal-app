import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Clock, TrendingUp, MessageSquare, Flag } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface CrewViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

const JUST_ENDED_WINDOW_MS = 60_000;

const CrewViewDialog = ({ open, onOpenChange, eventId }: CrewViewDialogProps) => {
  const { user } = useAuth();
  const { getEventById } = useEvents();
  const { toast } = useToast();

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [sessions, setSessions] = useState<{ name: string; start_time: string | null; duration: number | null }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gapAhead, setGapAhead] = useState("");
  const [freeText, setFreeText] = useState("");
  const [sending, setSending] = useState(false);
  const [crewEnabled, setCrewEnabled] = useState<boolean | null>(null);
  const [eventOwnerUserId, setEventOwnerUserId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const eventFromContext = getEventById(eventId || "");
  const resolvedEventName = eventName || eventFromContext?.name || null;
  const eventBaseDate = eventDate || (eventFromContext?.eventDate ? new Date(eventFromContext.eventDate) : null);

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

  useEffect(() => {
    if (!eventId || !user || !open) return;
    const loadSessions = async () => {
      const { data: rpcData } = await supabase.rpc('get_crew_event_info', { p_event_id: eventId });
      const eventRow = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (eventRow) {
        setEventOwnerUserId(eventRow.event_user_id);
        setEventName(eventRow.event_name);
        if (eventRow.event_date) setEventDate(new Date(eventRow.event_date));

        if (eventRow.public_event_id) {
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
          setCrewEnabled(true);
          const localSessions = parseLocalSessions(eventId);
          if (localSessions) setSessions(localSessions);
        }
      }
    };
    loadSessions();
  }, [eventId, user, open, parseLocalSessions]);

  useEffect(() => {
    if (!eventId || !open) return;
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
  }, [eventId, open, parseLocalSessions]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [open]);

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

  useEffect(() => {
    if (!eventId || !user || !open) return;
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
      .channel(`crew-dialog-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crew_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          setMessages((prev) => [payload.new as CrewMessage, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, user, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [messages.length]);

  const sendStructured = async () => {
    if (!eventId || !user) return;
    if (!gapAhead) {
      toast({ title: "Enter gap ahead", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("crew_messages").insert({
      event_id: eventId,
      user_id: user.id,
      gap_ahead: gapAhead || null,
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setGapAhead("");
    }
    setSending(false);
  };

  const sendFreeText = async () => {
    if (!eventId || !user || !freeText.trim()) return;
    setSending(true);
    const { error } = await supabase.from("crew_messages").insert({
      event_id: eventId,
      user_id: user.id,
      message: freeText.trim(),
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setFreeText("");
    }
    setSending(false);
  };

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), "h:mm:ss a"); } catch { return ts; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Crew View</span>
            <Badge variant="outline" className="text-xs px-2 py-0.5 animate-pulse border-green-500 text-green-500 font-semibold">
              ● LIVE
            </Badge>
          </DialogTitle>
          {resolvedEventName && (
            <p className="text-sm text-muted-foreground truncate">{resolvedEventName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {crewEnabled === false && (
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-5 py-6 text-center">
              <MessageSquare size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground mb-1">Crew Messaging Not Enabled</p>
              <p className="text-xs text-muted-foreground">The event organizer has not enabled crew messaging for this driver yet.</p>
            </div>
          )}

          {crewEnabled && activeSessionInfo && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 backdrop-blur-sm px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-green-500 font-semibold">
                    {activeSessionInfo.name ? "Session Active" : "Time Remaining"}
                  </p>
                  {activeSessionInfo.name && (
                    <p className="text-sm font-medium text-foreground">{activeSessionInfo.name}</p>
                  )}
                </div>
                <p className="text-2xl font-black text-green-400 tabular-nums">
                  {activeSessionInfo.label}
                </p>
              </div>
              {activeSessionInfo.progress !== null && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-green-500/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${activeSessionInfo.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {crewEnabled && <>
            {!activeSessionInfo && justEndedSession && (
              <div className="rounded-xl border-2 border-yellow-500/60 bg-yellow-500/10 backdrop-blur-sm px-4 py-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-3xl">🏁</div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-yellow-500 font-bold mb-1">Session Complete</p>
                    <p className="text-lg font-black text-foreground">Come to Pits</p>
                    {justEndedSession.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{justEndedSession.name} has ended</p>
                    )}
                  </div>
                  <Flag size={24} className="text-yellow-500 flex-shrink-0" />
                </div>
              </div>
            )}

            {!activeSessionInfo && !justEndedSession && nextSessionCountdown && (
              <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-4 py-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Next Session</p>
                    <p className="text-sm font-medium text-foreground">{nextSessionCountdown.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary tabular-nums">{nextSessionCountdown.label}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">until start</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Update */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={14} className="text-primary" />
                  Quick Update
                  {activeSessionInfo?.name && (
                    <span className="text-xs text-muted-foreground font-normal">— {activeSessionInfo.name}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Gap Ahead</Label>
                    <Input
                      placeholder="+1.2s"
                      value={gapAhead}
                      onChange={(e) => setGapAhead(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    variant="pulse"
                    className="self-end h-8 px-3 text-xs"
                    onClick={sendStructured}
                    disabled={sending || !gapAhead}
                  >
                    <Send size={12} /> Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Message */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare size={14} className="text-primary" />
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-3">
                <Textarea
                  placeholder="Type a message to the driver..."
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="min-h-[50px] text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFreeText(); } }}
                />
                <Button
                  variant="default"
                  className="w-full h-8 text-xs"
                  onClick={sendFreeText}
                  disabled={sending || !freeText.trim()}
                >
                  <Send size={12} /> Send Message
                </Button>
              </CardContent>
            </Card>

            {/* Message History */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Message History</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="h-[200px]" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div key={msg.id} className="p-2 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                            {msg.gap_ahead && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Gap: {msg.gap_ahead}</Badge>}
                            {msg.position && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{msg.position}</Badge>}
                            {msg.time_remaining && <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><Clock size={8} className="mr-0.5" />{msg.time_remaining}</Badge>}
                          </div>
                          {msg.message && <p className="text-xs text-foreground">{msg.message}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrewViewDialog;
