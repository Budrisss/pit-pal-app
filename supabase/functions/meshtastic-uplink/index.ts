import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-channel",
};

/**
 * Receives HMAC-signed POSTs from the gateway-side MQTT bridge script and
 * routes each Meshtastic packet into either crew_messages or event_flags.
 *
 * Sender verification: each uplink is keyed by the radio's Meshtastic node id
 * (bridge `from` field, hex like "!a3b1c9d8"). We look that up in
 * lora_paired_devices to (1) reject unknown radios and (2) enrich crew messages
 * with the registration's car number.
 */

interface BridgePayload {
  channel: string;
  from: string;       // Meshtastic node id, e.g. "!a3b1c9d8"
  rssi?: number;
  snr?: number;
  received_at: number;
  text?: string;
  position?: {
    latitude: number;
    longitude: number;
    altitude_m?: number | null;
    heading_deg?: number | null;
    speed_mps?: number | null;
    fix_time?: number | null; // unix seconds
  };
}

interface LoRaPayload {
  t: "flag" | "msg" | "gap" | "ack";
  v: string;
  ts: number;
  f?: string;
  from?: string;
}

async function verifyHmac(secret: string, body: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const channel = req.headers.get("X-Channel");
  const signature = req.headers.get("X-Signature");
  if (!channel || !signature) {
    return new Response(JSON.stringify({ error: "Missing X-Channel or X-Signature" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Look up channel mapping
  const { data: mapping, error: mapErr } = await supabase
    .from("lora_event_channels")
    .select("event_id, organizer_user_id, hmac_secret")
    .eq("channel_name", channel)
    .maybeSingle();

  if (mapErr || !mapping) {
    return new Response(JSON.stringify({ error: "Unknown channel" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ok = await verifyHmac(mapping.hmac_secret, rawBody, signature);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let bridge: BridgePayload;
  try {
    bridge = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve sender node → paired device → registration
  // Crew messages from unknown radios are dropped silently (security).
  const nodeId = bridge.from?.startsWith("!") ? bridge.from : `!${bridge.from ?? ""}`;
  const { data: paired } = await supabase
    .from("lora_paired_devices")
    .select("user_id, event_registration_id")
    .eq("meshtastic_node_id", nodeId)
    .maybeSingle();

  // Bump last_seen_at for any known node so organizers see liveness
  if (paired) {
    await supabase
      .from("lora_paired_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("meshtastic_node_id", nodeId);
  }

  // Position packet branch — independent of text/flag content.
  if (bridge.position && paired) {
    const { error: posErr } = await supabase.from("lora_position_fixes").insert({
      event_id: mapping.event_id,
      event_registration_id: paired.event_registration_id ?? null,
      user_id: paired.user_id,
      meshtastic_node_id: nodeId,
      latitude: bridge.position.latitude,
      longitude: bridge.position.longitude,
      altitude_m: bridge.position.altitude_m ?? null,
      heading_deg: bridge.position.heading_deg ?? null,
      speed_mps: bridge.position.speed_mps ?? null,
      fix_time: bridge.position.fix_time ? new Date(bridge.position.fix_time * 1000).toISOString() : null,
    });
    if (posErr) {
      console.error("[meshtastic-uplink] position insert failed", posErr);
    }
    // If there's no text content, we're done.
    if (!bridge.text) {
      return new Response(JSON.stringify({ ok: true, type: "position" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // No text content (e.g. position-only packet from unknown node) — accept and exit.
  if (!bridge.text) {
    return new Response(JSON.stringify({ ok: true, type: "noop" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let inner: LoRaPayload;
  try {
    inner = JSON.parse(bridge.text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid inner payload" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const senderId = paired?.user_id ?? inner.from ?? inner.f ?? bridge.from;

  if (inner.t === "flag") {
    // Flags coming back over uplink are typically organizer rebroadcasts —
    // we trust the channel HMAC + organizer mapping for these.
    const [flagType, ...rest] = inner.v.split("|");
    const message = rest.length > 0 ? rest.join("|") : null;
    const { error } = await supabase.from("event_flags").insert({
      event_id: mapping.event_id,
      organizer_id: mapping.organizer_user_id,
      flag_type: flagType,
      message,
      is_active: true,
    });
    if (error) {
      console.error("[meshtastic-uplink] flag insert failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (inner.t === "msg" || inner.t === "gap") {
    if (!paired) {
      console.warn("[meshtastic-uplink] dropping msg from unknown node", nodeId);
      return new Response(JSON.stringify({ ok: false, reason: "unknown_node" }), {
        status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich with car number if we can resolve the registration
    let position: string | null = null;
    if (paired.event_registration_id) {
      const { data: reg } = await supabase
        .from("event_registrations")
        .select("car_number")
        .eq("id", paired.event_registration_id)
        .maybeSingle();
      if (reg?.car_number != null) position = `#${reg.car_number}`;
    }

    const { error } = await supabase.from("crew_messages").insert({
      event_id: mapping.event_id,
      user_id: senderId,
      message: inner.t === "msg" ? inner.v : null,
      gap_ahead: inner.t === "gap" ? inner.v : null,
      position,
    });
    if (error) {
      console.error("[meshtastic-uplink] crew msg insert failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, type: inner.t }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
