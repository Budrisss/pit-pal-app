import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, Settings, Plus, Trash2, GripVertical, StickyNote, Timer, AlertCircle, Cloud, Thermometer, Eye, Wind } from "lucide-react";
import { useState, useEffect } from "react";
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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEvents } from "@/contexts/EventsContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SessionTireDataCard from "@/components/SessionTireDataCard";


interface Session {
  id: string;
  type: "practice" | "qualifying" | "race";
  duration: number; // in minutes
  referenceName: string;
  startTime: string; // Format: "HH:MM"
  notes?: string;
  
  state?: "upcoming" | "active" | "completed";
}


interface EventData {
  id: string;
  name: string;
  track: string;
  date: string; // ISO date string
  time: string; // HH:MM format
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

interface Settings {
  bufferHours: number;
  bufferMinutes: number;
}

// Sortable Session Item Component for Time-Based System
const SortableSessionItem = ({ session, totalSessions, onDelete, onMarkComplete, isSameDayEvent }: {
  session: Session;
  totalSessions: number;
  onDelete: (id: string) => void;
  onMarkComplete: (id: string) => void;
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

  const getStateColor = () => {
    switch (session.state) {
      case "active": return "border-green-500 bg-green-500/10";
      case "completed": return "border-red-500 bg-red-500/10";
      case "upcoming": return "border-blue-500 bg-blue-500/10";
      default: return "border-border bg-background/50";
    }
  };

  const getStateBadge = () => {
    switch (session.state) {
      case "active": return <Badge className="bg-green-500 text-white">Active</Badge>;
      case "completed": return <Badge className="bg-red-500 text-white">Completed</Badge>;
      case "upcoming": return <Badge className="bg-blue-500 text-white">Upcoming</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border ${getStateColor()}`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical size={16} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStateBadge()}
            <Badge variant="outline" className="capitalize">
              {session.type}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {session.duration} min
            </span>
            <span className="text-sm font-medium text-foreground">
              @ {session.startTime}
            </span>
          </div>
          <p className="font-medium text-foreground">
            {session.referenceName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSameDayEvent && session.state !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(session.id)}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Mark Complete
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(session.id)}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={16} />
          </Button>
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

  // Generate sessions based on event type
  const getEventSessions = (eventId: string): { sessions: Session[], eventData: EventData } => {
    const today = new Date();
    const todayISOString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (eventId === "test-event") {
      // Test event starting at 7pm today with 10-minute sessions
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
      // Get event from context
      const currentEvent = getEventById(eventId || "");
      
      if (currentEvent) {
        const eventDate = new Date(currentEvent.eventDate);
        const isSameDayEvent = today.toDateString() === eventDate.toDateString();
        
        console.log('SessionManagement: Event found', {
          eventId,
          eventName: currentEvent.name,
          eventDate: eventDate.toDateString(),
          today: today.toDateString(),
          isSameDayEvent,
          schedule: currentEvent.schedule
        });
        
        if (isSameDayEvent && (!currentEvent.schedule || currentEvent.schedule.length === 0)) {
          // Same-day events with empty schedule start with empty sessions for manual creation
          console.log('Same-day event with empty schedule - starting with no sessions');
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
        
        // Use event data from context
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
      
      // Fallback for unknown events
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

  // Core state for time-based system - initialize with empty array to prevent race condition
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<Settings>({ bufferHours: 4, bufferMinutes: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [eventState, setEventState] = useState<"pre-event" | "active" | "post-event">("pre-event");
  
  // Notes editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  
  // Weather state
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  
  // New session form state
  const [newSessionType, setNewSessionType] = useState<"practice" | "qualifying" | "race">("practice");
  const [newSessionDuration, setNewSessionDuration] = useState("20");
  const [newSessionTime, setNewSessionTime] = useState("13:00");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Real-time session state calculator
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

      // For same-day events, mark sessions as completed when they end
      if (isSameDayEvent) {
        // If the session was already manually marked as completed, keep it that way
        if (session.state === "completed") {
          return { ...session, state: "completed" as const };
        }
        
        // Auto-complete if session has ended
        if (isAfter(now, sessionEnd)) {
          return { ...session, state: "completed" as const };
        } else if (isAfter(now, sessionStart) && isBefore(now, sessionEnd)) {
          return { ...session, state: "active" as const };
        } else {
          return { ...session, state: "upcoming" as const };
        }
      } else {
        // Original logic for non-same-day events
        if (isAfter(now, sessionEnd)) {
          return { ...session, state: "completed" as const };
        } else if (isAfter(now, sessionStart) && isBefore(now, sessionEnd)) {
          return { ...session, state: "active" as const };
        } else {
          return { ...session, state: "upcoming" as const };
        }
      }
    });
  };

  // Get next upcoming session
  const getNextUpcomingSession = () => {
    const statedSessions = calculateSessionStates();
    const upcomingSessions = statedSessions.filter(session => session.state === "upcoming");
    if (upcomingSessions.length === 0) return null;
    
    // Sort by start time to get the next one
    return upcomingSessions.sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    })[0];
  };

  // Get remaining time for active session
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

  // Calculate countdown to next session
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

  // Check event state
  const determineEventState = () => {
    const statedSessions = calculateSessionStates();
    const hasActive = statedSessions.some(session => session.state === "active");
    const hasUpcoming = statedSessions.some(session => session.state === "upcoming");
    const allCompleted = statedSessions.every(session => session.state === "completed");

    if (allCompleted) return "post-event";
    if (hasActive || hasUpcoming) return "active";
    return "pre-event";
  };

  // Format countdown display
  const formatCountdown = (countdown: ReturnType<typeof getCountdownToNext>) => {
    if (!countdown) return "No upcoming sessions";

    const { days, hours, minutes, seconds } = countdown;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  // Fetch weather data
  const fetchWeatherData = async () => {
    if (!eventData.address) {
      setWeatherError("Weather not available - no address provided");
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { address: eventData.address }
      });

      if (error) throw error;
      setWeatherData(data);
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherError('Failed to fetch weather data');
    } finally {
      setWeatherLoading(false);
    }
  };

  // Setup data save handler
  const handleSaveSetupData = async (sessionId: string, data: any) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast({
          title: "Authentication required",
          description: "Please log in to save setup data",
          variant: "destructive"
        });
        return;
      }

      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        toast({
          title: "Session not found",
          description: "Could not find the selected session",
          variant: "destructive"
        });
        return;
      }

      const setupData = {
        session_id: sessionId,
        session_name: session.referenceName,
        user_id: userData.user.id,
        // Front Left
        fl_cold_pressure: data.frontLeft.coldPressure ? parseFloat(data.frontLeft.coldPressure) : null,
        fl_hot_pressure: data.frontLeft.pressure ? parseFloat(data.frontLeft.pressure) : null,
        fl_temp_outside: data.frontLeft.tempOutside ? parseFloat(data.frontLeft.tempOutside) : null,
        fl_temp_center: data.frontLeft.tempCenter ? parseFloat(data.frontLeft.tempCenter) : null,
        fl_temp_inside: data.frontLeft.tempInside ? parseFloat(data.frontLeft.tempInside) : null,
        // Front Right
        fr_cold_pressure: data.frontRight.coldPressure ? parseFloat(data.frontRight.coldPressure) : null,
        fr_hot_pressure: data.frontRight.pressure ? parseFloat(data.frontRight.pressure) : null,
        fr_temp_outside: data.frontRight.tempOutside ? parseFloat(data.frontRight.tempOutside) : null,
        fr_temp_center: data.frontRight.tempCenter ? parseFloat(data.frontRight.tempCenter) : null,
        fr_temp_inside: data.frontRight.tempInside ? parseFloat(data.frontRight.tempInside) : null,
        // Rear Left
        rl_cold_pressure: data.rearLeft.coldPressure ? parseFloat(data.rearLeft.coldPressure) : null,
        rl_hot_pressure: data.rearLeft.pressure ? parseFloat(data.rearLeft.pressure) : null,
        rl_temp_outside: data.rearLeft.tempOutside ? parseFloat(data.rearLeft.tempOutside) : null,
        rl_temp_center: data.rearLeft.tempCenter ? parseFloat(data.rearLeft.tempCenter) : null,
        rl_temp_inside: data.rearLeft.tempInside ? parseFloat(data.rearLeft.tempInside) : null,
        // Rear Right
        rr_cold_pressure: data.rearRight.coldPressure ? parseFloat(data.rearRight.coldPressure) : null,
        rr_hot_pressure: data.rearRight.pressure ? parseFloat(data.rearRight.pressure) : null,
        rr_temp_outside: data.rearRight.tempOutside ? parseFloat(data.rearRight.tempOutside) : null,
        rr_temp_center: data.rearRight.tempCenter ? parseFloat(data.rearRight.tempCenter) : null,
        rr_temp_inside: data.rearRight.tempInside ? parseFloat(data.rearRight.tempInside) : null,
      };

      const { error } = await supabase
        .from('setup_data')
        .insert(setupData);

      if (error) throw error;

      toast({
        title: "Setup data saved",
        description: `Tire data for ${session.referenceName} has been saved successfully`
      });
    } catch (error) {
      console.error('Error saving setup data:', error);
      toast({
        title: "Error saving data",
        description: "Failed to save setup data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather data on mount and every 10 minutes
  useEffect(() => {
    fetchWeatherData();
    const weatherInterval = setInterval(fetchWeatherData, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(weatherInterval);
  }, [eventData.address]);

  // Update session states and event state - only after sessions are loaded
  useEffect(() => {
    if (!sessionsLoaded || sessions.length === 0) return;
    
    const updatedSessions = calculateSessionStates();
    setSessions(updatedSessions);
    setEventState(determineEventState());

    // Check for sessions that just ended (for note prompt)
    const now = currentTime;
    const eventDate = parseISO(eventData.date);
    
    const justEndedSession = updatedSessions.find(session => {
      const [hours, minutes] = session.startTime.split(':').map(Number);
      const sessionStart = new Date(eventDate);
      sessionStart.setHours(hours, minutes, 0, 0);
      const sessionEnd = addMinutes(sessionStart, session.duration);
      
      // Check if session just ended (within the last 30 seconds)
      const timeSinceEnd = differenceInMilliseconds(now, sessionEnd);
      const wasActive = sessions.find(s => s.id === session.id && s.state === "active");
      
      return timeSinceEnd >= 0 && timeSinceEnd <= 30000 && wasActive && !showNotePrompt;
    });
    
    if (justEndedSession) {
      setCompletedSessionId(justEndedSession.id);
      setShowNotePrompt(true);
    }
  }, [currentTime, sessionsLoaded]);

  // Load data from localStorage first
  useEffect(() => {
    const savedSessions = localStorage.getItem(`sessions-${eventId}`);
    const savedNotes = localStorage.getItem(`session-notes-${eventId}`);
    const savedSettings = localStorage.getItem(`session-settings-${eventId}`);
    
    let loadedSessions = defaultSessions;
    
    // Load sessions from localStorage first
    if (savedSessions) {
      try {
        loadedSessions = JSON.parse(savedSessions);
        console.log('Loaded sessions from localStorage:', loadedSessions);
      } catch (error) {
        console.error("Error loading sessions:", error);
        loadedSessions = defaultSessions;
      }
    }
    
    // Apply saved notes to sessions
    if (savedNotes) {
      try {
        const notesData = JSON.parse(savedNotes);
        loadedSessions = loadedSessions.map(session => ({
          ...session,
          notes: notesData[session.id] || session.notes || ""
        }));
      } catch (error) {
        console.error("Error loading session notes:", error);
      }
    }

    // Load settings
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    
    setSessions(loadedSessions);
    setSessionsLoaded(true);
  }, [eventId]);

  // Save session notes to localStorage
  const saveSessionNotes = (sessionId: string, notes: string) => {
    const savedNotes = localStorage.getItem(`session-notes-${eventId}`) || "{}";
    try {
      const notesData = JSON.parse(savedNotes);
      notesData[sessionId] = notes;
      localStorage.setItem(`session-notes-${eventId}`, JSON.stringify(notesData));
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, notes } : session
      ));
    } catch (error) {
      console.error("Error saving session notes:", error);
    }
  };

  // Save sessions to localStorage
  const saveSessions = (sessionsToSave: Session[]) => {
    localStorage.setItem(`sessions-${eventId}`, JSON.stringify(sessionsToSave));
  };

  // Save settings to localStorage
  const saveSettings = (newSettings: Settings) => {
    localStorage.setItem(`session-settings-${eventId}`, JSON.stringify(newSettings));
    setSettings(newSettings);
  };


  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSessions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedSessions = arrayMove(items, oldIndex, newIndex);
        saveSessions(reorderedSessions);
        return reorderedSessions;
      });
    }
  };

  const handleAddSession = () => {
    const sessionTypeDisplayName = newSessionType.charAt(0).toUpperCase() + newSessionType.slice(1);
    const defaultReferenceName = `${sessionTypeDisplayName} Session`;
    
    const newSession: Session = {
      id: Date.now().toString(),
      type: newSessionType,
      duration: parseInt(newSessionDuration),
      referenceName: defaultReferenceName,
      startTime: newSessionTime,
      state: "upcoming"
    };
    
    setSessions(prev => {
      const updatedSessions = [...prev, newSession];
      saveSessions(updatedSessions);
      return updatedSessions;
    });
    setNewSessionDuration("20");
    setNewSessionType("practice");
    setNewSessionTime("13:00");
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => {
      const updatedSessions = prev.filter(s => s.id !== sessionId);
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  };

  const handleMarkSessionComplete = (sessionId: string) => {
    setSessions(prev => {
      const updatedSessions = prev.map(session => 
        session.id === sessionId 
          ? { ...session, state: "completed" as const }
          : session
      );
      saveSessions(updatedSessions);
      return updatedSessions;
    });
  };

  const handleSaveNoteFromPrompt = () => {
    if (completedSessionId && noteInput.trim()) {
      saveSessionNotes(completedSessionId, noteInput);
    }
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

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditNoteText("");
  };

  const handleBackToEvents = () => {
    navigate('/events');
  };

  const countdown = getCountdownToNext();
  const currentActiveSession = calculateSessionStates().find(s => s.state === "active");
  const activeSessionRemainingTime = getActiveSessionRemainingTime();
  
  // Check if this is a same-day event
  const eventDate = parseISO(eventData.date);
  const today = new Date();
  const isSameDayEvent = today.toDateString() === eventDate.toDateString();

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-20">
      {/* Header */}
      <div className="bg-gradient-hero p-4 sm:p-6 lg:p-8 rounded-b-3xl mb-6 lg:mx-6">
        <div className="flex items-center gap-4 mb-4 max-w-7xl mx-auto">
          <Button 
            variant="ghost" 
            size="default" 
            onClick={handleBackToEvents}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              Session Management
            </h1>
            <p className="text-white/80 text-sm lg:text-base">Event: {eventData.name}</p>
          </div>
          {/* Settings Button */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Settings size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Session Management Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buffer Time Before Event (when countdown turns red)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="buffer-hours" className="text-sm text-muted-foreground">Hours</Label>
                      <Input
                        id="buffer-hours"
                        type="number"
                        value={settings.bufferHours}
                        onChange={(e) => setSettings(prev => ({ ...prev, bufferHours: parseInt(e.target.value) || 0 }))}
                        min="0"
                        max="24"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="buffer-minutes" className="text-sm text-muted-foreground">Minutes</Label>
                      <Input
                        id="buffer-minutes"
                        type="number"
                        value={settings.bufferMinutes}
                        onChange={(e) => setSettings(prev => ({ ...prev, bufferMinutes: parseInt(e.target.value) || 0 }))}
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={() => {
                  saveSettings(settings);
                  setShowSettings(false);
                }}>
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-4 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Top Row - Time, Event Details, Weather */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
          {/* Current Time Display - Big and Prominent */}
          <Card className="bg-gradient-dark border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                  {format(currentTime, "HH:mm:ss")}
                </div>
                <div className="text-sm lg:text-lg text-muted-foreground">
                  {format(currentTime, "EEEE, MMMM d, yyyy")}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details Card */}
          <Card className="bg-gradient-dark border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="text-primary" size={20} />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Track:</span>
                  <span className="text-foreground font-medium">{eventData.track}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground font-medium">{format(parseISO(eventData.date), "MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span className="text-foreground font-medium">{eventData.car}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather Conditions */}
          {eventData.address && (
            <Card className="bg-gradient-dark border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Cloud className="text-primary" size={20} />
                  Track Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weatherLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading weather...</p>
                  </div>
                )}
                
                {weatherError && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle size={24} className="mx-auto mb-2" />
                    <p>{weatherError}</p>
                  </div>
                )}
                
                {weatherData && (
                  <div className="space-y-4">
                    {/* Weather warnings */}
                    {weatherData.warnings.length > 0 && (
                      <div className="space-y-2">
                        {weatherData.warnings.map((warning, index) => (
                          <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive font-medium">{warning}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Weather grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Thermometer size={16} className="text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Temperature</p>
                          <p className="font-medium">{weatherData.temperature}°F</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Cloud size={16} className="text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Condition</p>
                          <p className="font-medium">{weatherData.condition}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Wind size={16} className="text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Wind</p>
                          <p className="font-medium">{weatherData.windSpeed} mph {weatherData.windDirection}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Visibility</p>
                          <p className="font-medium">{weatherData.visibility} mi</p>
                        </div>
                      </div>
                    </div>
                    
                    {weatherData.precipitation > 0 && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-400">
                          💧 Precipitation: {weatherData.precipitation}" • Humidity: {weatherData.humidity}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Session Status & Countdown - Full Width */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Timer className="text-primary" size={20} />
              Session Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Active Session */}
              {currentActiveSession && (
                <div className="p-4 rounded-lg border border-green-500 bg-green-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500 text-white">Currently Active</Badge>
                    <Badge variant="outline" className="capitalize">
                      {currentActiveSession.type}
                    </Badge>
                  </div>
                  <p className="font-bold text-lg text-foreground">
                    {currentActiveSession.referenceName}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Started at {currentActiveSession.startTime} • {currentActiveSession.duration} minutes
                    </p>
                    {activeSessionRemainingTime && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Time Remaining</p>
                        <p className="text-xl font-bold text-green-400">
                          {activeSessionRemainingTime.minutes}m {activeSessionRemainingTime.seconds}s
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Countdown to Next Session */}
              {countdown && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Next: {countdown.nextSession.referenceName}
                  </p>
                  <div className={`text-3xl font-bold ${
                    countdown.isInBufferZone ? "text-red-500" : "text-foreground"
                  }`}>
                    {formatCountdown(countdown)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    until {countdown.nextSession.referenceName}
                  </p>
                </div>
              )}

              {/* Post-Event State */}
              {eventState === "post-event" && (
                <div className="text-center p-6 rounded-lg border border-orange-500 bg-orange-500/10">
                  <AlertCircle className="mx-auto mb-4 text-orange-500" size={48} />
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Sorry for missing your sessions, how did it go?
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    All sessions have been completed. Would you like to add notes about today's event?
                  </p>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="How did the event go? Any setup changes needed for next time?"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="h-20"
                    />
                    <Button 
                      onClick={() => {
                        if (noteInput.trim()) {
                          // Save general event notes
                          localStorage.setItem(`event-summary-${eventId}`, noteInput);
                          setNoteInput("");
                        }
                      }}
                      disabled={!noteInput.trim()}
                    >
                      Save Event Summary
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Tire Data Card - For recording tire temps and pressure per session */}
        <SessionTireDataCard
          sessions={sessions}
          onSaveData={handleSaveSetupData}
        />


        {/* Bottom Row - Session Management */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
          {/* Add New Session */}
          <Card className="bg-gradient-dark border-border/50">
            <Accordion type="single" collapsible defaultValue="add-session">
              <AccordionItem value="add-session">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Plus className="text-primary" size={20} />
                    <span className="text-lg font-bold text-foreground">Add New Session</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="session-type">Session Type</Label>
                        <Select value={newSessionType} onValueChange={(value) => setNewSessionType(value as "practice" | "qualifying" | "race")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select session type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="qualifying">Qualifying</SelectItem>
                            <SelectItem value="race">Race</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={newSessionDuration}
                          onChange={(e) => setNewSessionDuration(e.target.value)}
                          min="1"
                          max="120"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="session-time">Start Time</Label>
                        <Input
                          id="session-time"
                          type="time"
                          value={newSessionTime}
                          onChange={(e) => setNewSessionTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddSession}
                      className="w-full"
                    >
                      <Plus size={16} />
                      Add Session
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Session Schedule */}
          <Card className="bg-gradient-dark border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="text-primary" size={20} />
                Session Schedule ({sessions.length} sessions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={sessions.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sessions.map((session) => (
                      <div key={session.id} className="space-y-2">
                        <SortableSessionItem
                          session={session}
                          totalSessions={sessions.length}
                          onDelete={handleDeleteSession}
                          onMarkComplete={handleMarkSessionComplete}
                          isSameDayEvent={isSameDayEvent}
                        />
                        {/* Session notes display and editing */}
                        <div className="ml-8 space-y-2">
                          {editingNoteId === session.id ? (
                            // Edit mode
                            <div className="p-3 bg-secondary/30 rounded">
                              <div className="flex items-center gap-1 mb-2">
                                <StickyNote size={12} />
                                <span className="font-medium text-sm">Edit Notes:</span>
                              </div>
                              <Textarea
                                value={editNoteText}
                                onChange={(e) => setEditNoteText(e.target.value)}
                                placeholder="Add session notes: tire pressure, brake feel, handling balance, sector times..."
                                className="h-20 text-sm"
                              />
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleSaveNote(session.id)}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Display mode
                            <div>
                              {session.notes ? (
                                <div className="p-2 bg-secondary/30 rounded text-sm text-muted-foreground">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                      <StickyNote size={12} />
                                      <span className="font-medium">Notes:</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditNote(session.id)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                  <p>{session.notes}</p>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditNote(session.id)}
                                  className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
                                >
                                  <Plus size={12} className="mr-1" />
                                  Add notes
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <div className="text-center py-8 space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center gap-2 justify-center mb-2">
                            <AlertCircle className="text-blue-400" size={20} />
                            <span className="font-medium text-blue-400">Same-Day Event</span>
                          </div>
                          <p className="text-sm text-foreground mb-2">
                            Events created after 8:00 AM on the same day start with an empty schedule to avoid conflicts.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Use the "Add New Session" form to create your custom session schedule.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note Prompt Dialog */}
      <Dialog open={showNotePrompt} onOpenChange={setShowNotePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Your session has ended. Would you like to add notes about how it went?
            </p>
            <Textarea
              placeholder="Session notes: tire pressure, brake feel, handling balance, sector times..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="h-24"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveNoteFromPrompt} disabled={!noteInput.trim()}>
                Save Notes
              </Button>
              <Button variant="outline" onClick={() => {
                setShowNotePrompt(false);
                setNoteInput("");
                setCompletedSessionId(null);
              }}>
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionManagement;