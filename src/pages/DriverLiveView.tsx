import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, TrendingUp, Hash, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const event = getEventById(eventId || "");

  // Derive latest structured data from most recent message that has it
  const latestPosition = messages.find((m) => m.position)?.position || "—";
  const latestGap = messages.find((m) => m.gap_ahead)?.gap_ahead || "—";
  const latestTimeRemaining = messages.find((m) => m.time_remaining)?.time_remaining || "—";

  // Load + subscribe
  useEffect(() => {
    if (!eventId || !user) return;

    const load = async () => {
      const { data } = await supabase
        .from("crew_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (data) setMessages(data as CrewMessage[]);
    };
    load();

    const channel = supabase
      .channel(`driver-crew-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crew_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          setMessages((prev) => [payload.new as CrewMessage, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, user]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [messages.length]);

  const formatTime = (ts: string) => {
    try { return format(new Date(ts), "h:mm:ss a"); } catch { return ts; }
  };

  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Driver Live View</h1>
            <p className="text-sm text-muted-foreground truncate">{event?.name || "Event"}</p>
          </div>
          <Badge variant="outline" className="text-xs animate-pulse border-green-500 text-green-500">LIVE</Badge>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Status Cards */}
          <div className="space-y-4">
            {/* Hero Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 text-center">
                  <Hash size={18} className="mx-auto text-primary mb-1" />
                  <p className="text-3xl font-bold text-foreground">{latestPosition}</p>
                  <p className="text-xs text-muted-foreground">Position</p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 text-center">
                  <TrendingUp size={18} className="mx-auto text-primary mb-1" />
                  <p className="text-3xl font-bold text-foreground">{latestGap}</p>
                  <p className="text-xs text-muted-foreground">Gap Ahead</p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 text-center">
                  <Clock size={18} className="mx-auto text-primary mb-1" />
                  <p className="text-3xl font-bold text-foreground">{latestTimeRemaining}</p>
                  <p className="text-xs text-muted-foreground">Time Left</p>
                </CardContent>
              </Card>
            </div>

            {/* Crew View Link */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Share this link with your crew:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background/50 p-2 rounded border border-border/30 truncate">
                    {window.location.origin}/crew-live/{eventId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/crew-live/${eventId}`);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Live Feed */}
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                Crew Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] lg:h-[500px]" ref={feedRef}>
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Waiting for crew updates...</p>
                    <p className="text-xs text-muted-foreground mt-1">Updates will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-3 rounded-lg bg-background/50 border border-border/30">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                          {msg.position && (
                            <Badge variant="secondary" className="text-xs">{msg.position}</Badge>
                          )}
                          {msg.gap_ahead && (
                            <Badge variant="secondary" className="text-xs">Gap: {msg.gap_ahead}</Badge>
                          )}
                          {msg.time_remaining && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock size={10} className="mr-1" />{msg.time_remaining}
                            </Badge>
                          )}
                        </div>
                        {msg.message && (
                          <p className="text-sm text-foreground">{msg.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default DriverLiveView;
