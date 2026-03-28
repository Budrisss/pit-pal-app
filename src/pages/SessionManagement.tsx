import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, Settings, Plus, Trash2, GripVertical, StickyNote, Timer, AlertCircle, Cloud, Thermometer, Eye, Wind, Play, CheckCircle2, MoreVertical, Megaphone } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addMinutes, differenceInMilliseconds, isAfter, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEvents } from "@/contexts/EventsContext";
import SessionTireDataCard from "@/components/SessionTireDataCard";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";

interface Session {
  id: string;
  type: "practice" | "qualifying" | "race";
  duration: number;
  referenceName: string;
  startTime: string;
  notes?: string;
  state?: "upcoming" | "active" | "completed";
}

interface EventData {
  id: string;
  name: string;
  track: string;
  date: string;
  time: string;
  car: string;
  address?: string;
}

interface WeatherData {
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  humidity: number;
  warnings: string[];
}

interface SettingsData {
  bufferHours: number;
  bufferMinutes: number;
}

// Sortable Session Item
const SortableSessionItem = ({ session, onDelete, onMarkComplete, onEditNote, isSameDayEvent }: {
  session: Session;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onEditNote: (id: string) => void;
  isSameDayEvent: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getBorderColor = () => {
    switch (session.state) {
      case "active": return "border-l-green-500";
      case "completed": return "border-l-muted-foreground/40";
      case "upcoming": return "border-l-primary";
      default: return "border-l-border";
    }
  };

  const getStateDot = () => {
    switch (session.state) {
      case "active": return "bg-green-500 animate-pulse";
      case "completed": return "bg-muted-foreground/40";
      case "upcoming": return "bg-primary";
      default: return "bg-border";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border border-border/50 bg-card/40 backdrop-blur-sm border-l-4 ${getBorderColor()} ${session.state === "completed" ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical size={14} />
        </div>

        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStateDot()}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-foreground truncate">{session.referenceName}</span>
            <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
              {session.type}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{session.startTime}</span>
            <span className="text-border">•</span>
            <span>{session.duration} min</span>
            {session.notes && (
              <>
                <span className="text-border">•</span>
                <StickyNote size={10} className="text-racing-orange" />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSameDayEvent && session.state === "active" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-500 hover:bg-green-500/10"
              onClick={() => onMarkComplete(session.id)}
            >
              <CheckCircle2 size={14} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditNote(session.id)}>
                <StickyNote size={14} className="mr-2" />
                {session.notes ? "Edit Notes" : "Add Notes"}
              </DropdownMenuItem>
              {isSameDayEvent && session.state !== "completed" && (
                <DropdownMenuItem onClick={() => onMarkComplete(session.id)}>
                  <CheckCircle2 size={14} className="mr-2" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(session.id)}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const SessionManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { getEventById } = useEvents();
  const { toast } = useToast();

  const getEventSessions = (eventId: string): { sessions: Session[], eventData: EventData } => {
    const today = new Date();
    const todayISOString = today.toISOString().split('T')[0];

    if (eventId === "test-event") {
      return {
        sessions: [
          { id: "1", type: "practice", duration: 10, referenceName: "Evening Practice 1", startTime: "19:00", state: "upcoming" },
          { id: "2", type: "practice", duration: 10, referenceName: "Evening Practice 2", startTime: "19:15", state: "upcoming" },
          { id: "3", type: "qualifying", duration: 10, referenceName: "Quick Qualifying", startTime: "19:30", state: "upcoming" },
          { id: "4", type: "race", duration: 10, referenceName: "Sprint Race", startTime: "19:45", state: "upcoming" },
          { id: "5", type: "practice", duration: 10, referenceName: "Cool Down Session", startTime: "20:00", state: "upcoming" }
        ],
        eventData: {
          id: eventId,
          name: "Test Track Day - Live Session",
          track: "Test Circuit",
          date: todayISOString,
          time: "19:00",
          car: "Test Car - Session Ready",
          address: "34 teal dr. Langhorne, PA 19047"
        }
      };
    } else {
      const currentEvent = getEventById(eventId || "");

      if (currentEvent) {
        const eventDate = new Date(currentEvent.eventDate);
        const isSameDayEvent = today.toDateString() === eventDate.toDateString();

        if (isSameDayEvent && (!currentEvent.schedule || currentEvent.schedule.length === 0)) {
          return {
            sessions: [],
            eventData: {
              id: eventId || "1",
              name: currentEvent.name,
              track: currentEvent.track,
              date: eventDate.toISOString().split('T')[0],
              time: currentEvent.time,
              car: currentEvent.car,
              address: currentEvent.address || ""
            }
          };
        }

        return {
          sessions: [
            { id: "1", type: "practice", duration: 20, referenceName: "Morning Warm-up", startTime: "08:00", state: "upcoming" },
            { id: "2", type: "practice", duration: 30, referenceName: "Setup Testing", startTime: "09:00", state: "upcoming" },
            { id: "3", type: "qualifying", duration: 15, referenceName: "Grid Position", startTime: "10:00", state: "upcoming" },
            { id: "4", type: "race", duration: 45, referenceName: "Feature Race", startTime: "11:00", state: "upcoming" },
            { id: "5", type: "practice", duration: 20, referenceName: "Cool Down", startTime: "12:30", state: "upcoming" }
          ],
          eventData: {
            id: eventId || "1",
            name: currentEvent.name,
            track: currentEvent.track,
            date: eventDate.toISOString().split('T')[0],
            time: currentEvent.time,
            car: currentEvent.car,
            address: currentEvent.address || ""
          }
        };
      }

      return {
        sessions: [
          { id: "1", type: "practice", duration: 20, referenceName: "Morning Warm-up", startTime: "08:00", state: "upcoming" },
          { id: "2", type: "practice", duration: 30, referenceName: "Setup Testing", startTime: "09:00", state: "upcoming" },
          { id: "3", type: "qualifying", duration: 15, referenceName: "Grid Position", startTime: "10:00", state: "upcoming" },
          { id: "4", type: "race", duration: 45, referenceName: "Feature Race", startTime: "11:00", state: "upcoming" },
          { id: "5", type: "practice", duration: 20, referenceName: "Cool Down", startTime: "12:30", state: "upcoming" }
        ],
        eventData: {
          id: eventId || "1",
          name: "Thunderhill Track Day",
          track: "Thunderhill Raceway",
          date: "2024-03-15",
          time: "08:00",
          car: "Track Beast - 2018 Mazda MX-5",
          address: "5250 CA-162, Willows, CA 95988"
        }
      };
    }
  };

  const { sessions: defaultSessions, eventData } = getEventSessions(eventId || "");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<SettingsData>({ bufferHours: 4, bufferMinutes: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [eventState, setEventState] = useState<"pre-event" | "active" | "post-event">("pre-event");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [newSessionType, setNewSessionType] = useState<"practice" | "qualifying" | "race">("practice");
  const [newSessionDuration, setNewSessionDuration] = useState("20");
  const [newSessionTime, setNewSessionTime] = useState("13:00");
  const [showAddSession, setShowAddSession] = useState(false);
  const [announcements, setAnnouncements] = useState<{ id: string; message: string; created_at: string }[]>([]);
  const [publicEventId, setPublicEventId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const calculateSessionStates = () => {
    const now = currentTime;
    const eventDate = parseISO(eventData.date);
    const today = new Date();
    const isSameDayEvent = today.toDateString() === eventDate.toDateString();

    return sessions.map(session => {
      const [hours, minutes] = session.startTime.split(':').map(Number);
      const sessionStart = new Date(eventDate);
      sessionStart.setHours(hours, minutes, 0, 0);
      const sessionEnd = addMinutes(sessionStart, session.duration);

      if (isSameDayEvent && session.state === "completed") {
        return { ...session, state: "completed" as const };
      }

      if (isAfter(now, sessionEnd)) {
        return { ...session, state: "completed" as const };
      } else if (isAfter(now, sessionStart) && isBefore(now, sessionEnd)) {
        return { ...session, state: "active" as const };
      } else {
        return { ...session, state: "upcoming" as const };
      }
    });
  };

  const getNextUpcomingSession = () => {
    const statedSessions = calculateSessionStates();
    const upcomingSessions = statedSessions.filter(s => s.state === "upcoming");
    if (upcomingSessions.length === 0) return null;
    return upcomingSessions.sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    })[0];
  };

  const getActiveSessionRemainingTime = () => {
    const statedSessions = calculateSessionStates();
    const activeSession = statedSessions.find(s => s.state === "active");
    if (!activeSession) return null;
    const eventDate = parseISO(eventData.date);
    const [hours, minutes] = activeSession.startTime.split(':').map(Number);
    const sessionStart = new Date(eventDate);
    sessionStart.setHours(hours, minutes, 0, 0);
    const sessionEnd = addMinutes(sessionStart, activeSession.duration);
    const diffMs = differenceInMilliseconds(sessionEnd, currentTime);
    if (diffMs <= 0) return null;
    const mins = Math.floor(diffMs / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { minutes: mins, seconds: secs, totalMs: diffMs };
  };

  const getCountdownToNext = () => {
    const nextSession = getNextUpcomingSession();
    if (!nextSession) return null;
    const eventDate = parseISO(eventData.date);
    const [hours, minutes] = nextSession.startTime.split(':').map(Number);
    const sessionStart = new Date(eventDate);
    sessionStart.setHours(hours, minutes, 0, 0);
    const diffMs = differenceInMilliseconds(sessionStart, currentTime);
    if (diffMs <= 0) return null;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const bufferMs = (settings.bufferHours * 60 + settings.bufferMinutes) * 60 * 1000;
    const isInBufferZone = diffMs <= bufferMs;
    return { days, hours: hrs, minutes: mins, seconds: secs, isInBufferZone, totalMs: diffMs, nextSession };
  };

  const determineEventState = () => {
    const statedSessions = calculateSessionStates();
    const allCompleted = statedSessions.every(s => s.state === "completed");
    if (allCompleted && statedSessions.length > 0) return "post-event";
    return "active";
  };

  const formatCountdown = (countdown: ReturnType<typeof getCountdownToNext>) => {
    if (!countdown) return "No upcoming sessions";
    const { days, hours, minutes, seconds } = countdown;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const fetchWeatherData = async () => {
    if (!eventData.address) {
      setWeatherError("No address provided");
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { address: eventData.address }
      });
      if (error) {
        // Graceful fallback — don't crash
        const msg = typeof error === 'object' && error.message ? error.message : String(error);
        if (msg.includes('not configured') || msg.includes('API key')) {
          setWeatherError("Weather unavailable");
        } else {
          setWeatherError("Weather unavailable");
        }
        return;
      }
      setWeatherData(data);
    } catch {
      setWeatherError("Weather unavailable");
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleSaveSetupData = async (sessionId: string, data: any) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast({ title: "Authentication required", description: "Please log in to save setup data", variant: "destructive" });
        return;
      }
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        toast({ title: "Session not found", variant: "destructive" });
        return;
      }
      const setupData = {
        session_id: sessionId,
        session_name: session.referenceName,
        user_id: userData.user.id,
        fl_cold_pressure: data.frontLeft.coldPressure ? parseFloat(data.frontLeft.coldPressure) : null,
        fl_hot_pressure: data.frontLeft.pressure ? parseFloat(data.frontLeft.pressure) : null,
        fl_temp_outside: data.frontLeft.tempOutside ? parseFloat(data.frontLeft.tempOutside) : null,
        fl_temp_center: data.frontLeft.tempCenter ? parseFloat(data.frontLeft.tempCenter) : null,
        fl_temp_inside: data.frontLeft.tempInside ? parseFloat(data.frontLeft.tempInside) : null,
        fr_cold_pressure: data.frontRight.coldPressure ? parseFloat(data.frontRight.coldPressure) : null,
        fr_hot_pressure: data.frontRight.pressure ? parseFloat(data.frontRight.pressure) : null,
        fr_temp_outside: data.frontRight.tempOutside ? parseFloat(data.frontRight.tempOutside) : null,
        fr_temp_center: data.frontRight.tempCenter ? parseFloat(data.frontRight.tempCenter) : null,
        fr_temp_inside: data.frontRight.tempInside ? parseFloat(data.frontRight.tempInside) : null,
        rl_cold_pressure: data.rearLeft.coldPressure ? parseFloat(data.rearLeft.coldPressure) : null,
        rl_hot_pressure: data.rearLeft.pressure ? parseFloat(data.rearLeft.pressure) : null,
        rl_temp_outside: data.rearLeft.tempOutside ? parseFloat(data.rearLeft.tempOutside) : null,
        rl_temp_center: data.rearLeft.tempCenter ? parseFloat(data.rearLeft.tempCenter) : null,
        rl_temp_inside: data.rearLeft.tempInside ? parseFloat(data.rearLeft.tempInside) : null,
        rr_cold_pressure: data.rearRight.coldPressure ? parseFloat(data.rearRight.coldPressure) : null,
        rr_hot_pressure: data.rearRight.pressure ? parseFloat(data.rearRight.pressure) : null,
        rr_temp_outside: data.rearRight.tempOutside ? parseFloat(data.rearRight.tempOutside) : null,
        rr_temp_center: data.rearRight.tempCenter ? parseFloat(data.rearRight.tempCenter) : null,
        rr_temp_inside: data.rearRight.tempInside ? parseFloat(data.rearRight.tempInside) : null,
      };
      const { error } = await (supabase as any).from('setup_data').insert(setupData);
      if (error) throw error;
      toast({ title: "Setup data saved", description: `Tire data for ${session.referenceName} saved` });
    } catch (error) {
      console.error('Error saving setup data:', error);
      toast({ title: "Error saving data", description: "Failed to save setup data.", variant: "destructive" });
    }
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather on mount
  useEffect(() => {
    fetchWeatherData();
    const weatherInterval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, [eventData.address]);

  // Update session states
  useEffect(() => {
    if (!sessionsLoaded || sessions.length === 0) return;
    const updatedSessions = calculateSessionStates();
    setSessions(updatedSessions);
    setEventState(determineEventState());

    const now = currentTime;
    const eventDate = parseISO(eventData.date);
    const justEndedSession = updatedSessions.find(session => {
      const [hours, minutes] = session.startTime.split(':').map(Number);
      const sessionStart = new Date(eventDate);
      sessionStart.setHours(hours, minutes, 0, 0);
      const sessionEnd = addMinutes(sessionStart, session.duration);
      const timeSinceEnd = differenceInMilliseconds(now, sessionEnd);
      const wasActive = sessions.find(s => s.id === session.id && s.state === "active");
      return timeSinceEnd >= 0 && timeSinceEnd <= 30000 && wasActive && !showNotePrompt;
    });
    if (justEndedSession) {
      setCompletedSessionId(justEndedSession.id);
      setShowNotePrompt(true);
    }
  }, [currentTime, sessionsLoaded]);

  // Load sessions — for registered events, always fetch from organizer's public_event_sessions
  // For personal events, load from localStorage with hardcoded defaults as fallback
  useEffect(() => {
    const loadSessions = async () => {
      // Check if this is a registered event first
      const { data: eventRow } = await (supabase as any)
        .from("events")
        .select("public_event_id")
        .eq("id", eventId)
        .maybeSingle();

      if (eventRow?.public_event_id) {
        // Registered event — fetch organizer sessions as source of truth
        const { data: orgSessions } = await (supabase as any)
          .from("public_event_sessions")
          .select("*")
          .eq("event_id", eventRow.public_event_id)
          .order("sort_order", { ascending: true });
        if (orgSessions && orgSessions.length > 0) {
          const mapped: Session[] = orgSessions.map((s: any) => ({
            id: s.id,
            type: "practice" as const,
            duration: s.duration_minutes || 20,
            referenceName: s.name,
            startTime: s.start_time || "00:00",
            state: "upcoming" as const,
          }));
          setSessions(mapped);
          localStorage.setItem(`sessions-${eventId}`, JSON.stringify(mapped));
        } else {
          setSessions([]);
        }
      } else {
        // Personal event — use localStorage / hardcoded defaults
        const savedSessions = localStorage.getItem(`sessions-${eventId}`);
        let loadedSessions = defaultSessions;
        if (savedSessions) {
          try { loadedSessions = JSON.parse(savedSessions); } catch { loadedSessions = defaultSessions; }
        }
        const savedNotes = localStorage.getItem(`session-notes-${eventId}`);
        if (savedNotes) {
          try {
            const notesData = JSON.parse(savedNotes);
            loadedSessions = loadedSessions.map(s => ({ ...s, notes: notesData[s.id] || s.notes || "" }));
          } catch {}
        }
        setSessions(loadedSessions);
        if (!savedSessions && loadedSessions.length > 0) {
          localStorage.setItem(`sessions-${eventId}`, JSON.stringify(loadedSessions));
        }
      }

      const savedSettings = localStorage.getItem(`session-settings-${eventId}`);
      if (savedSettings) {
        try { setSettings(JSON.parse(savedSettings)); } catch {}
      }
      setSessionsLoaded(true);
    };

    loadSessions();
  }, [eventId]);

  // Fetch public_event_id for this event, load organizer sessions, and set up realtime subscriptions
  useEffect(() => {
    if (!eventId) return;

    const fetchOrganizerSessions = async (peId: string) => {
      const { data: orgSessions } = await (supabase as any)
        .from("public_event_sessions")
        .select("*")
        .eq("event_id", peId)
        .order("sort_order", { ascending: true });
      if (orgSessions && orgSessions.length > 0) {
        const mapped: Session[] = orgSessions.map((s: any) => ({
          id: s.id,
          type: "practice" as const,
          duration: s.duration_minutes || 20,
          referenceName: s.name,
          startTime: s.start_time || "00:00",
          state: "upcoming" as const,
        }));
        setSessions(mapped);
        localStorage.setItem(`sessions-${eventId}`, JSON.stringify(mapped));
      }
    };

    const setupRealtime = async () => {
      const { data: eventRow } = await (supabase as any)
        .from("events")
        .select("public_event_id")
        .eq("id", eventId)
        .maybeSingle();

      const peId = eventRow?.public_event_id;
      if (!peId) return;
      setPublicEventId(peId);

      // Load organizer sessions as the source of truth
      await fetchOrganizerSessions(peId);

      // Fetch initial announcements
      const { data: annData } = await (supabase as any)
        .from("event_announcements")
        .select("id, message, created_at")
        .eq("event_id", peId)
        .order("created_at", { ascending: false });
      if (annData) setAnnouncements(annData);

      // Subscribe to public_event_sessions changes
      const sessionsChannel = supabase
        .channel(`live-sessions-${peId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "public_event_sessions", filter: `event_id=eq.${peId}` },
          () => fetchOrganizerSessions(peId)
        )
        .subscribe();

      // Subscribe to event_announcements
      const announcementsChannel = supabase
        .channel(`live-announcements-${peId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "event_announcements", filter: `event_id=eq.${peId}` },
          (payload) => {
            const newAnn = payload.new as { id: string; message: string; created_at: string };
            setAnnouncements((prev) => [newAnn, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sessionsChannel);
        supabase.removeChannel(announcementsChannel);
      };
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [eventId]);

  const saveSessionNotes = (sessionId: string, notes: string) => {
    const savedNotes = localStorage.getItem(`session-notes-${eventId}`) || "{}";
    try {
      const notesData = JSON.parse(savedNotes);
      notesData[sessionId] = notes;
      localStorage.setItem(`session-notes-${eventId}`, JSON.stringify(notesData));
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, notes } : s));
    } catch {}
  };

  const saveSessions = (sessionsToSave: Session[]) => {
    localStorage.setItem(`sessions-${eventId}`, JSON.stringify(sessionsToSave));
  };

  const saveSettings = (newSettings: SettingsData) => {
    localStorage.setItem(`session-settings-${eventId}`, JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSessions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        saveSessions(reordered);
        return reordered;
      });
    }
  };

  const handleAddSession = () => {
    const displayName = newSessionType.charAt(0).toUpperCase() + newSessionType.slice(1);
    const newSession: Session = {
      id: Date.now().toString(),
      type: newSessionType,
      duration: parseInt(newSessionDuration),
      referenceName: `${displayName} Session`,
      startTime: newSessionTime,
      state: "upcoming"
    };
    setSessions(prev => {
      const updated = [...prev, newSession];
      saveSessions(updated);
      return updated;
    });
    setNewSessionDuration("20");
    setNewSessionType("practice");
    setNewSessionTime("13:00");
    setShowAddSession(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
  };

  const handleMarkSessionComplete = (sessionId: string) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === sessionId ? { ...s, state: "completed" as const } : s);
      saveSessions(updated);
      return updated;
    });
  };

  const handleSaveNoteFromPrompt = () => {
    if (completedSessionId && noteInput.trim()) saveSessionNotes(completedSessionId, noteInput);
    setShowNotePrompt(false);
    setNoteInput("");
    setCompletedSessionId(null);
  };

  const handleEditNote = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    setEditingNoteId(sessionId);
    setEditNoteText(session?.notes || "");
  };

  const handleSaveNote = (sessionId: string) => {
    saveSessionNotes(sessionId, editNoteText);
    setEditingNoteId(null);
    setEditNoteText("");
  };

  const countdown = getCountdownToNext();
  const currentActiveSession = calculateSessionStates().find(s => s.state === "active");
  const activeSessionRemainingTime = getActiveSessionRemainingTime();
  const eventDate = parseISO(eventData.date);
  const today = new Date();
  const isSameDayEvent = today.toDateString() === eventDate.toDateString();
  const completedCount = calculateSessionStates().filter(s => s.state === "completed").length;
  const activeCount = calculateSessionStates().filter(s => s.state === "active").length;

  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />

      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/events')} className="flex-shrink-0">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{eventData.name}</h1>
            <p className="text-sm text-muted-foreground truncate">{eventData.track} • {eventData.car}</p>
          </div>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon"><Settings size={18} /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buffer Time (countdown turns red)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Hours</Label>
                      <Input type="number" value={settings.bufferHours} onChange={(e) => setSettings(p => ({ ...p, bufferHours: parseInt(e.target.value) || 0 }))} min="0" max="24" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Minutes</Label>
                      <Input type="number" value={settings.bufferMinutes} onChange={(e) => setSettings(p => ({ ...p, bufferMinutes: parseInt(e.target.value) || 0 }))} min="0" max="59" />
                    </div>
                  </div>
                </div>
                <Button onClick={() => { saveSettings(settings); setShowSettings(false); }}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Live Clock + Status Strip */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card/60 backdrop-blur-md p-4 sm:p-5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight tabular-nums">
                {format(currentTime, "HH:mm:ss")}
              </div>
              <p className="text-sm text-muted-foreground">{format(currentTime, "EEEE, MMMM d, yyyy")}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sessions</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-green-500">{completedCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Done</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-primary">{activeCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Session Banner */}
        {currentActiveSession && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{currentActiveSession.referenceName}</p>
                  <p className="text-sm text-muted-foreground">
                    Started at {currentActiveSession.startTime} • {currentActiveSession.type}
                  </p>
                </div>
              </div>
              {activeSessionRemainingTime && (
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-bold text-green-400 tabular-nums">
                    {activeSessionRemainingTime.minutes}:{activeSessionRemainingTime.seconds.toString().padStart(2, '0')}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Remaining</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-5 space-y-5 lg:space-y-0">
          {/* Left Column — Event Info + Weather */}
          <div className="space-y-5">
            {/* Event Details + Track Conditions Combined */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  Event Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Track</span>
                  <span className="font-medium text-foreground">{eventData.track}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">{format(parseISO(eventData.date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="font-medium text-foreground truncate ml-4">{eventData.car}</span>
                </div>

                {/* Weather / Track Conditions */}
                {eventData.address && (
                  <>
                    <div className="border-t border-border/50 pt-3 mt-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Cloud size={12} className="text-primary" />
                        Track Conditions
                      </p>
                    </div>
                    {weatherLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        Loading weather...
                      </div>
                    )}
                    {weatherError && (
                      <p className="text-sm text-muted-foreground">{weatherError}</p>
                    )}
                    {weatherData && (
                      <>
                        {weatherData.warnings.length > 0 && (
                          <div className="space-y-1">
                            {weatherData.warnings.map((w, i) => (
                              <div key={i} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">{w}</div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Thermometer size={14} className="text-primary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Temp</p>
                              <p className="font-medium">{weatherData.temperature}°F</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Cloud size={14} className="text-primary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Condition</p>
                              <p className="font-medium">{weatherData.condition}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wind size={14} className="text-primary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Wind</p>
                              <p className="font-medium">{weatherData.windSpeed} mph</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye size={14} className="text-primary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Visibility</p>
                              <p className="font-medium">{weatherData.visibility} mi</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Countdown to Next */}
            {countdown && !currentActiveSession && (
              <div className="rounded-xl border-2 border-primary/60 bg-gradient-to-br from-primary/10 to-card/80 backdrop-blur-sm p-5 text-center shadow-f1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2 relative">Next: {countdown.nextSession.referenceName}</p>
                <p className={`text-3xl sm:text-4xl font-bold tabular-nums relative ${countdown.isInBufferZone ? "text-destructive" : "text-foreground"}`}>
                  {formatCountdown(countdown)}
                </p>
              </div>
            )}

            {/* Live Announcements */}
            {publicEventId && announcements.length > 0 && (
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Megaphone size={14} className="text-primary" />
                    Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-sm text-foreground">{ann.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(ann.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column — Session Schedule (spans 2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Schedule Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Session Schedule
                <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
              </h2>
              <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
                <DialogTrigger asChild>
                  <Button variant="pulse" size="sm">
                    <Plus size={14} />
                    Add Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Session</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newSessionType} onValueChange={(v) => setNewSessionType(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="qualifying">Qualifying</SelectItem>
                            <SelectItem value="race">Race</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (min)</Label>
                        <Input type="number" value={newSessionDuration} onChange={(e) => setNewSessionDuration(e.target.value)} min="1" max="120" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" value={newSessionTime} onChange={(e) => setNewSessionTime(e.target.value)} />
                    </div>
                    <Button onClick={handleAddSession} className="w-full">
                      <Plus size={14} />
                      Add Session
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Session List */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="space-y-1">
                      <SortableSessionItem
                        session={session}
                        onDelete={handleDeleteSession}
                        onMarkComplete={handleMarkSessionComplete}
                        onEditNote={handleEditNote}
                        isSameDayEvent={isSameDayEvent}
                      />
                      {/* Inline note editing */}
                      {editingNoteId === session.id && (
                        <div className="ml-6 p-3 bg-card/60 backdrop-blur-sm border border-border/50 rounded-lg">
                          <Textarea
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            placeholder="Tire pressure, brake feel, handling notes..."
                            className="h-20 text-sm mb-2"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveNote(session.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(null); setEditNoteText(""); }}>Cancel</Button>
                          </div>
                        </div>
                      )}
                      {/* Show existing note */}
                      {editingNoteId !== session.id && session.notes && (
                        <div className="ml-6 px-3 py-2 bg-card/30 border border-border/30 rounded text-xs text-muted-foreground cursor-pointer hover:bg-card/50 transition-colors"
                          onClick={() => handleEditNote(session.id)}
                        >
                          <span className="text-racing-orange mr-1">📝</span> {session.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <Timer size={28} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1">No sessions yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Add sessions to build your schedule</p>
                      <Button variant="pulse" size="sm" onClick={() => setShowAddSession(true)}>
                        <Plus size={14} />
                        Add First Session
                      </Button>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            {/* Post-Event Summary */}
            {eventState === "post-event" && (
              <Card className="border-racing-orange/30 bg-racing-orange/5 backdrop-blur-sm">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-racing-orange" />
                    <h3 className="font-bold text-foreground">Event Complete</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">All sessions completed. Add notes about today's event:</p>
                  <Textarea
                    placeholder="How did the event go? Setup changes for next time?"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="h-20"
                  />
                  <Button
                    onClick={() => {
                      if (noteInput.trim()) {
                        localStorage.setItem(`event-summary-${eventId}`, noteInput);
                        setNoteInput("");
                        toast({ title: "Summary saved" });
                      }
                    }}
                    disabled={!noteInput.trim()}
                    size="sm"
                  >
                    Save Summary
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Tire Data */}
        <SessionTireDataCard sessions={sessions} onSaveData={handleSaveSetupData} />
      </div>

      {/* Note Prompt Dialog */}
      <Dialog open={showNotePrompt} onOpenChange={setShowNotePrompt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Session Completed</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">Would you like to add notes about how it went?</p>
            <Textarea
              placeholder="Tire pressure, brake feel, handling balance..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="h-24"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveNoteFromPrompt} disabled={!noteInput.trim()}>Save Notes</Button>
              <Button variant="outline" onClick={() => { setShowNotePrompt(false); setNoteInput(""); setCompletedSessionId(null); }}>Skip</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default SessionManagement;
