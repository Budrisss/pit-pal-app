import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Clock, Hash, TrendingUp, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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


const CrewLiveView = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEventById } = useEvents();
  const { toast } = useToast();

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [gapAhead, setGapAhead] = useState("");
  const [position, setPosition] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [freeText, setFreeText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const event = getEventById(eventId || "");


  // Load existing messages + subscribe to realtime
  useEffect(() => {
    if (!eventId || !user) return;

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
  }, [eventId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [messages.length]);

  const sendStructured = async () => {
    if (!eventId || !user) return;
    if (!gapAhead && !position && !timeRemaining) {
      toast({ title: "Enter at least one field", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("crew_messages").insert({
      event_id: eventId,
      user_id: user.id,
      gap_ahead: gapAhead || null,
      position: position || null,
      time_remaining: timeRemaining || null,
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setGapAhead("");
      setPosition("");
      setTimeRemaining("");
    }
    setSending(false);
  };

  const sendFreeText = async () => {
    if (!eventId || !user || !freeText.trim()) return;
    setSending(true);
    const { error } = await supabase.from("crew_messages").insert({
      event_id: eventId,
      user_id: user.id,
      session_id: selectedSessionId || null,
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
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Crew View</h1>
            <p className="text-sm text-muted-foreground truncate">{event?.name || "Event"}</p>
          </div>
          <Badge variant="outline" className="text-xs">CREW</Badge>
        </div>

        {/* Session Selector */}
        {sessions.length > 0 && (
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select session (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sessions</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Structured Quick Entry */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Quick Update
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Gap Ahead</Label>
                <Input
                  placeholder="+1.2s"
                  value={gapAhead}
                  onChange={(e) => setGapAhead(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Input
                  placeholder="P3"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Time Left</Label>
                <Input
                  placeholder="8:30"
                  value={timeRemaining}
                  onChange={(e) => setTimeRemaining(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button
              variant="pulse"
              className="w-full"
              onClick={sendStructured}
              disabled={sending || (!gapAhead && !position && !timeRemaining)}
            >
              <Send size={14} /> Send Update
            </Button>
          </CardContent>
        </Card>

        {/* Free Text */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" />
              Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Type a message to the driver..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="min-h-[60px]"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFreeText(); } }}
            />
            <Button
              variant="default"
              className="w-full"
              onClick={sendFreeText}
              disabled={sending || !freeText.trim()}
            >
              <Send size={14} /> Send Message
            </Button>
          </CardContent>
        </Card>

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
      </div>
      <Navigation />
    </div>
  );
};

export default CrewLiveView;
