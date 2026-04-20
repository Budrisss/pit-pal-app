import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LiveTrackMap from "@/components/LiveTrackMap";

interface ParticipantInfo {
  id: string;
  user_name: string;
  car_number: number | null;
  run_group_id: string | null;
}

const LiveTrackMapFullscreen = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [eventName, setEventName] = useState("");
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!eventId || !user) return;

    const load = async () => {
      // Authorize: must be the organizer of this event
      const { data: ev } = await supabase
        .from("public_events")
        .select("name, organizer_id")
        .eq("id", eventId)
        .single();

      if (!ev) {
        setAuthorized(false);
        return;
      }

      const { data: org } = await supabase
        .from("organizer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!org || org.id !== ev.organizer_id) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);
      setEventName(ev.name);

      const { data: regs } = await supabase
        .from("event_registrations")
        .select("id, user_name, car_number, run_group_id")
        .eq("event_id", eventId);

      setParticipants((regs as ParticipantInfo[]) || []);
      setLoading(false);
    };

    load();

    // Keep participant list fresh so new registrants appear on the map
    const channel = supabase
      .channel(`fullscreen-map-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations", filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from("event_registrations")
            .select("id, user_name, car_number, run_group_id")
            .eq("event_id", eventId)
            .then(({ data }) => {
              if (data) setParticipants(data as ParticipantInfo[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user]);

  if (authorized === false) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!eventId || authorized === null || loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-background relative">
      {/* Floating context overlay */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-xs font-bold text-primary tracking-wider">LIVE</span>
          <span className="text-sm font-semibold text-foreground truncate max-w-[40vw]">
            {eventName}
          </span>
          <span className="text-xs text-muted-foreground">
            · {participants.length} {participants.length === 1 ? "participant" : "participants"}
          </span>
        </div>
      </div>

      {/* Fullscreen map — fills entire viewport */}
      <div className="absolute inset-0">
        <LiveTrackMap eventId={eventId} participants={participants} fullscreen />
      </div>
    </div>
  );
};

export default LiveTrackMapFullscreen;
