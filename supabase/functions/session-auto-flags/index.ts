import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Convert a Date to a local date/time in a given IANA timezone */
function toLocalTime(date: Date, timezone: string): { hours: number; minutes: number; dateStr: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    hours: parseInt(get("hour"), 10),
    minutes: parseInt(get("minute"), 10),
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // Get today's public events (check multiple possible "today" dates across timezones)
    // We fetch upcoming events and filter by local date
    const { data: events, error: evErr } = await supabase
      .from("public_events")
      .select("id, organizer_id, date, timezone")
      .eq("status", "upcoming");

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to events where today's local date matches the event date
    const todayEvents = events.filter((event) => {
      const tz = event.timezone || "America/New_York"; // fallback
      const local = toLocalTime(now, tz);
      return local.dateStr === event.date;
    });

    if (todayEvents.length === 0) {
      return new Response(JSON.stringify({ message: "No events today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let actionsPerformed = 0;

    // Deactivate checkered flags older than 2 minutes across all today's events
    const twoMinAgo = new Date(now.getTime() - 2 * 60000).toISOString();
    for (const event of todayEvents) {
      const { data: staleCheckered } = await supabase
        .from("event_flags")
        .select("id")
        .eq("event_id", event.id)
        .eq("flag_type", "checkered")
        .eq("is_active", true)
        .lt("created_at", twoMinAgo);
      if (staleCheckered && staleCheckered.length > 0) {
        await supabase
          .from("event_flags")
          .update({ is_active: false })
          .in("id", staleCheckered.map((f: any) => f.id));
        actionsPerformed += staleCheckered.length;
      }
    }

    for (const event of todayEvents) {
      const tz = event.timezone || "America/New_York";
      const localNow = toLocalTime(now, tz);
      // Current time in minutes since midnight in the event's local timezone
      const nowMinutes = localNow.hours * 60 + localNow.minutes;

      // Get sessions for this event
      const { data: sessions, error: sessErr } = await supabase
        .from("public_event_sessions")
        .select("id, name, start_time, duration_minutes, sort_order, run_group_id")
        .eq("event_id", event.id)
        .order("sort_order");

      if (sessErr || !sessions || sessions.length === 0) continue;

      // Get active flags for this event
      const { data: activeFlags } = await supabase
        .from("event_flags")
        .select("id, flag_type, session_id, is_active")
        .eq("event_id", event.id)
        .eq("is_active", true);

      const currentActiveFlags = activeFlags || [];

      for (const session of sessions) {
        if (!session.start_time || !session.duration_minutes) continue;

        const [h, m] = session.start_time.split(":").map(Number);
        const sessionStartMinutes = h * 60 + m;
        const sessionEndMinutes = sessionStartMinutes + session.duration_minutes;

        const isActive = nowMinutes >= sessionStartMinutes && nowMinutes < sessionEndMinutes;
        const hasEnded = nowMinutes >= sessionEndMinutes;

        // Session is active — ensure a green flag exists for it
        if (isActive) {
          const hasGreenForSession = currentActiveFlags.some(
            (f) =>
              f.session_id === session.id &&
              f.flag_type === "green"
          );
          const hasAnyGlobalFlag = currentActiveFlags.some(
            (f) =>
              f.session_id === session.id &&
              !["yellow_turn", "blue"].includes(f.flag_type) &&
              f.flag_type !== "checkered"
          );

          if (!hasGreenForSession && !hasAnyGlobalFlag) {
            // Deactivate stale flags from previous sessions
            const staleFlags = currentActiveFlags.filter(
              (f) => f.session_id && f.session_id !== session.id
            );
            if (staleFlags.length > 0) {
              await supabase
                .from("event_flags")
                .update({ is_active: false })
                .in(
                  "id",
                  staleFlags.map((f) => f.id)
                );
            }

            await supabase.from("event_flags").insert({
              event_id: event.id,
              organizer_id: event.organizer_id,
              flag_type: "green",
              message: "Auto-sent by server",
              is_active: true,
              session_id: session.id,
            });
            actionsPerformed++;
          }
        }

        // Session has ended — check if checkered was already sent
        if (hasEnded) {
          const { data: existingCheckered } = await supabase
            .from("event_flags")
            .select("id")
            .eq("event_id", event.id)
            .eq("session_id", session.id)
            .eq("flag_type", "checkered")
            .limit(1);

          if (!existingCheckered || existingCheckered.length === 0) {
            // Only send checkered within 2 minutes of session end
            const minutesPastEnd = nowMinutes - sessionEndMinutes;
            if (minutesPastEnd >= 0 && minutesPastEnd < 2) {
              // Deactivate all active flags
              if (currentActiveFlags.length > 0) {
                await supabase
                  .from("event_flags")
                  .update({ is_active: false })
                  .eq("event_id", event.id)
                  .eq("is_active", true);
              }

              await supabase.from("event_flags").insert({
                event_id: event.id,
                organizer_id: event.organizer_id,
                flag_type: "checkered",
                message: "Session complete (auto)",
                is_active: true,
                session_id: session.id,
              });
              actionsPerformed++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${todayEvents.length} events, ${actionsPerformed} actions`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("session-auto-flags error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
