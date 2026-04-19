import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-channel",
};

/**
 * Receives HMAC-signed POSTs from the gateway-side MQTT bridge script and
 * routes each Meshtastic packet into either crew_messages or event_flags.
 *
 * Wire format from the bridge:
 *   POST /meshtastic-uplink
 *   Headers: X-Channel: <channel_name>, X-Signature: <hex sha256>
 *   Body (raw JSON, signed as-is):
 *     { "channel": "...", "from": "...", "rssi": -82, "snr": 7,
 *       "received_at": 1234567890123, "text": "<our LoRaPayload JSON>" }
 *
 * The "text" field is our existing encoded LoRaPayload (see encoder.ts):
 *   { t: "flag" | "msg" | "gap", v, ts, f }
 */

interface BridgePayload {
  channel: string;
  from: string;
  rssi?: number;
  snr?: number;
  received_at: number;
  text: string;
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
  // constant-time compare
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

  let inner: LoRaPayload;
  try {
    inner = JSON.parse(bridge.text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid inner payload" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const senderId = inner.from ?? inner.f ?? bridge.from;

  if (inner.t === "flag") {
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
    const { error } = await supabase.from("crew_messages").insert({
      event_id: mapping.event_id,
      user_id: senderId,
      message: inner.t === "msg" ? inner.v : null,
      gap_ahead: inner.t === "gap" ? inner.v : null,
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
