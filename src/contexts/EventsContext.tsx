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
  addEvent: (event: Omit<Event, "id">) => Promise<void>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string, cancelRegistration?: boolean) => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

// Map DB row to Event interface
const mapDbRowToEvent = (row: any): Event => {
  const eventDate = new Date(`${row.date}T${row.time || "00:00"}`);
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

  const addEvent = async (event: Omit<Event, "id">) => {
    if (!user) return;

    // Parse the date back to ISO format for storage
    const dateStr = event.eventDate.toISOString().split("T")[0];
    const timeStr = event.eventDate.toTimeString().slice(0, 5); // HH:MM

    const { error } = await (supabase as any).from("events").insert({
      user_id: user.id,
      name: event.name,
      date: dateStr,
      time: timeStr,
      address: event.address || null,
      description: event.description || null,
      status: event.status || "upcoming",
      car_id: event.car_id || null,
    });

    if (!error) {
      await fetchEvents();
    }
  };

  const updateEvent = async (event: Event) => {
    if (!user) return;

    const dateStr = event.eventDate.toISOString().split("T")[0];
    const timeStr = event.eventDate.toTimeString().slice(0, 5);

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
