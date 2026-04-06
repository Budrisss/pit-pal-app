import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    // Get today's public events
    const { data: events, error: evErr } = await supabase
      .from("public_events")
      .select("id, organizer_id, date")
      .eq("date", today)
      .eq("status", "upcoming");

    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No events today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let actionsPerformed = 0;

    for (const event of events) {
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
        const sessionStart = new Date(now);
        sessionStart.setFullYear(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        sessionStart.setHours(h, m, 0, 0);

        const sessionEnd = new Date(
          sessionStart.getTime() + session.duration_minutes * 60000
        );

        const isActive = now >= sessionStart && now < sessionEnd;
        const hasEnded = now >= sessionEnd;

        // Session is active — ensure a green flag exists for it
        if (isActive) {
          const hasGreenForSession = currentActiveFlags.some(
            (f) =>
              f.session_id === session.id &&
              f.flag_type === "green"
          );
          // Also check if there's any non-local active flag for this session (organizer may have sent yellow/red)
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
          // Check if a checkered flag already exists for this session (active or inactive)
          const { data: existingCheckered } = await supabase
            .from("event_flags")
            .select("id")
            .eq("event_id", event.id)
            .eq("session_id", session.id)
            .eq("flag_type", "checkered")
            .limit(1);

          if (!existingCheckered || existingCheckered.length === 0) {
            // Check if the NEXT session is already active (don't send checkered if we're past this)
            const nextSession = sessions.find(
              (s) => s.sort_order > session.sort_order
            );
            const isImmediatelyAfterEnd =
              now.getTime() - sessionEnd.getTime() < 2 * 60000; // within 2 minutes of ending

            if (isImmediatelyAfterEnd) {
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
        message: `Processed ${events.length} events, ${actionsPerformed} actions`,
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
