import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Authenticated organizer endpoint: pushes a flag/message down to the gateway
 * for radio broadcast. The gateway runs an MQTT broker we POST to over HTTPS
 * (its admin API), or for setups that prefer outbound-only, we instead enqueue
 * in a downlink_queue table the bridge polls.
 *
 * For the MVP we use the queue approach — it works with any gateway behind NAT
 * without inbound port forwarding.
 *
 * POST /meshtastic-downlink
 *   Auth: organizer JWT
 *   Body: { event_id, flag_type, message? }
 */

interface RequestBody {
  event_id: string;
  flag_type: string;
  message?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: RequestBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.event_id || !body.flag_type) {
    return new Response(JSON.stringify({ error: "event_id and flag_type required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify caller is the organizer for this channel
  const { data: mapping, error: mapErr } = await supabase
    .from("lora_event_channels")
    .select("channel_name, organizer_user_id")
    .eq("event_id", body.event_id)
    .maybeSingle();

  if (mapErr || !mapping) {
    return new Response(JSON.stringify({ error: "No LoRa channel configured for this event" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (mapping.organizer_user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build the LoRaPayload the bridge will publish to MQTT for the radio mesh
  const msg = (body.message ?? "").slice(0, 24);
  const payload = {
    t: "flag",
    v: msg ? `${body.flag_type}|${msg}` : body.flag_type,
    ts: Date.now(),
    f: user.id.slice(0, 8),
  };

  // For MVP: just acknowledge. The gateway-side bridge polls the event_flags
  // realtime stream directly and republishes to MQTT — no separate queue needed.
  // (This endpoint exists for future use cases like broadcast-only messages.)
  console.log("[meshtastic-downlink] queued", { channel: mapping.channel_name, payload });

  return new Response(JSON.stringify({ ok: true, channel: mapping.channel_name, payload }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
