import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Event {
  id: string;
  name: string;
  track: string;
  date: string;
  time: string;
  status: "upcoming" | "completed";
  eventDate: Date;
  car: string;
  car_id?: string;
  address: string;
  description?: string;
  publicEventId?: string | null;
  weather?: { temperature: string; condition: string; windSpeed: string };
  schedule?: { time: string; activity: string }[];
  requirements?: string[];
}

const getEventStatus = (eventDate: Date): "upcoming" | "completed" => {
  return eventDate.getTime() > Date.now() ? "upcoming" : "completed";
};

interface EventsContextType {
  events: Event[];
  loading: boolean;
  addEvent: (event: Omit<Event, "id">) => Promise<string | null>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string, cancelRegistration?: boolean) => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

// Map DB row to Event interface
// Parse 12h ("8:00 AM") or 24h ("08:00") time strings to "HH:mm"
const normalizeTime = (t: string | null): string => {
  if (!t) return "00:00";
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const period = match12[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return t;
};

const mapDbRowToEvent = (row: any): Event => {
  const time24 = normalizeTime(row.time);
  const eventDate = new Date(`${row.date}T${time24}`);
  return {
    id: row.id,
    name: row.name,
    track: row.track_name || "",
    date: new Date(row.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: row.time
      ? new Date(`2000-01-01T${row.time}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "",
    status: row.status === "completed" ? "completed" : getEventStatus(eventDate),
    eventDate,
    car: row.car_name || "",
    address: row.address || "",
    description: row.description || undefined,
    publicEventId: row.public_event_id || null,
    schedule: Array.isArray(row.schedule) ? row.schedule : (typeof row.schedule === 'string' ? JSON.parse(row.schedule) : undefined),
    requirements: Array.isArray(row.requirements) ? row.requirements : undefined,
  };
};

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("events")
      .select("*, track_name:tracks(name), car_name:cars(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (!error && data) {
      // For events linked to public events, fetch track names
      const publicEventIds = (data as any[])
        .map((r: any) => r.public_event_id)
        .filter(Boolean);
      
      let peTrackNames: Record<string, string> = {};
      if (publicEventIds.length > 0) {
        const { data: peData } = await (supabase as any)
          .from("public_events")
          .select("id, track_name")
          .in("id", publicEventIds);
        if (peData) {
          peTrackNames = Object.fromEntries(
            (peData as any[]).map((pe: any) => [pe.id, pe.track_name || ""])
          );
        }
      }

      // Flatten joined names
      const mapped = (data as any[]).map((row) => {
        const flat = {
          ...row,
          track_name: row.track_name?.name || peTrackNames[row.public_event_id] || row.address || "",
          car_name: row.car_name?.name || "",
        };
        return mapDbRowToEvent(flat);
      });
      setEvents(mapped);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (event: Omit<Event, "id">): Promise<string | null> => {
    if (!user) return null;

    // Use local date parts to avoid UTC timezone shift
    const d = event.eventDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const { data, error } = await (supabase as any).from("events").insert({
      user_id: user.id,
      name: event.name,
      date: dateStr,
      time: timeStr,
      address: event.address || null,
      description: event.description || null,
      status: event.status || "upcoming",
      car_id: event.car_id || null,
      schedule: event.schedule && event.schedule.length > 0 ? JSON.stringify(event.schedule) : null,
      requirements: event.requirements && event.requirements.length > 0 ? event.requirements : null,
    }).select("id").single();

    if (!error && data) {
      await fetchEvents();
      return data.id;
    }
    return null;
  };

  const updateEvent = async (event: Event) => {
    if (!user) return;

    const d = event.eventDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const { error } = await (supabase as any)
      .from("events")
      .update({
        name: event.name,
        date: dateStr,
        time: timeStr,
        address: event.address || null,
        description: event.description || null,
        status: event.status,
        car_id: event.car_id || null,
        schedule: event.schedule && event.schedule.length > 0 ? JSON.stringify(event.schedule) : null,
        requirements: event.requirements && event.requirements.length > 0 ? event.requirements : null,
      })
      .eq("id", event.id)
      .eq("user_id", user.id);

    if (!error) {
      await fetchEvents();
    }
  };

  const deleteEvent = async (id: string, cancelRegistration?: boolean) => {
    if (!user) return;

    // If cancelling registration, look up the public_event_id and remove from event_registrations
    if (cancelRegistration) {
      const { data: eventRow } = await (supabase as any)
        .from("events")
        .select("public_event_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (eventRow?.public_event_id) {
        await (supabase as any)
          .from("event_registrations")
          .delete()
          .eq("event_id", eventRow.public_event_id)
          .eq("user_id", user.id);
      }
    }

    const { error } = await (supabase as any)
      .from("events")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const getEventById = (id: string) => {
    return events.find((event) => event.id === id);
  };

  return (
    <EventsContext.Provider
      value={{ events, loading, addEvent, updateEvent, deleteEvent, getEventById, refreshEvents: fetchEvents }}
    >
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
};
