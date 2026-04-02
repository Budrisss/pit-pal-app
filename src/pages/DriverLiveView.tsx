import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, TrendingUp, Hash, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { addMinutes, differenceInMilliseconds, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { format } from "date-fns";

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

const DriverLiveView = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEventById } = useEvents();
  const { toast } = useToast();

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [sessions, setSessions] = useState<{ name: string; start_time: string | null; duration: number | null }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const feedEndRef = useRef<HTMLDivElement>(null);

  const event = getEventById(eventId || "");

  const latestPosition = messages.find((m) => m.position)?.position || "—";
  const latestGap = messages.find((m) => m.gap_ahead)?.gap_ahead || "—";
  const latestTimeRemaining = messages.find((m) => m.time_remaining)?.time_remaining || "—";

  // Latest free-text message
  const latestMessage = messages.find((m) => m.message)?.message || null;

  const scrollToBottom = useCallback(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load sessions for timer
  useEffect(() => {
    if (!eventId || !user) return;
    const loadSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("name, start_time, duration")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setSessions(data);
    };
    loadSessions();
  }, [eventId, user]);

  // Tick every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute active session remaining time
  const activeSessionInfo = (() => {
    if (!event || !sessions.length) return null;
    for (const s of sessions) {
      if (!s.start_time || !s.duration) continue;
      try {
        const ed = parseISO(event.date);
        const [h, m] = s.start_time.split(':').map(Number);
        const start = new Date(ed);
        start.setHours(h, m, 0, 0);
        const end = addMinutes(start, s.duration);
        if (currentTime >= start && currentTime < end) {
          const diff = differenceInMilliseconds(end, currentTime);
          return {
            name: s.name,
            minutes: Math.floor(diff / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
          };
        }
      } catch { /* skip */ }
    }
    return null;
  })();

  // Load + subscribe
  useEffect(() => {
    if (!eventId || !user) return;

    const load = async () => {
      const { data } = await supabase
        .from("crew_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as CrewMessage[]);
    };
    load();

    const channel = supabase
      .channel(`driver-crew-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crew_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as CrewMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), "h:mm:ss a"); } catch { return ts; }
  };




  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Driver Live View</h1>
            <p className="text-sm text-muted-foreground truncate">{event?.name || "Event"}</p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1 animate-pulse border-green-500 text-green-500 font-semibold">
            ● LIVE
          </Badge>
        </div>

        {/* Active Session Timer */}
        {activeSessionInfo && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 backdrop-blur-sm px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">Session Active</p>
              <p className="text-sm font-medium text-foreground">{activeSessionInfo.name}</p>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-primary tabular-nums">
              {activeSessionInfo.minutes}:{activeSessionInfo.seconds.toString().padStart(2, '0')}
            </p>
          </div>
        )}

        {/* Hero Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/15 to-card/80 backdrop-blur-md p-6 sm:p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
            <Hash size={24} className="mx-auto text-primary mb-2 relative" />
            <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground tabular-nums relative tracking-tight">
              {latestPosition}
            </p>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground mt-2 font-medium relative">Position</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/15 to-card/80 backdrop-blur-md p-6 sm:p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
            <TrendingUp size={24} className="mx-auto text-primary mb-2 relative" />
            <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground tabular-nums relative tracking-tight">
              {latestGap}
            </p>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground mt-2 font-medium relative">Gap Ahead</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/15 to-card/80 backdrop-blur-md p-6 sm:p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
            <Clock size={24} className="mx-auto text-primary mb-2 relative" />
            <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground tabular-nums relative tracking-tight">
              {latestTimeRemaining}
            </p>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground mt-2 font-medium relative">Time Left</p>
          </div>
        </div>

        {/* Latest Message Banner */}
        {latestMessage && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 backdrop-blur-sm px-5 py-4">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Latest from Crew</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground">{latestMessage}</p>
          </div>
        )}

        {/* Live Feed */}
        <div>
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Crew Updates</h2>
              <Badge variant="secondary" className="text-xs ml-auto">{messages.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-[450px] p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-base text-muted-foreground">Waiting for crew updates...</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Updates will appear here in real-time</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="p-4 rounded-xl bg-background/60 border border-border/30 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs text-muted-foreground font-medium">{formatTime(msg.created_at)}</span>
                      {msg.position && (
                        <Badge className="text-xs bg-primary/20 text-primary border-primary/30">{msg.position}</Badge>
                      )}
                      {msg.gap_ahead && (
                        <Badge className="text-xs bg-accent/20 text-accent-foreground border-accent/30">Gap: {msg.gap_ahead}</Badge>
                      )}
                      {msg.time_remaining && (
                        <Badge className="text-xs bg-secondary text-secondary-foreground">
                          <Clock size={10} className="mr-1" />{msg.time_remaining}
                        </Badge>
                      )}
                    </div>
                    {msg.message && (
                      <p className="text-base text-foreground leading-relaxed">{msg.message}</p>
                    )}
                  </div>
                ))
              )}
              <div ref={feedEndRef} />
            </div>
          </div>

        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default DriverLiveView;
