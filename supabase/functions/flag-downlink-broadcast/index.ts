// Receives event_flags insert notifications from a DB trigger,
// looks up the LoRa channel + gateway URL for the event,
// signs the payload with HMAC-SHA256, and POSTs to the RAK gateway bridge.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlagPayload {
  flag_id: string;
  event_id: string;
  flag_type: string;
  message: string | null;
  target_user_id: string | null;
  session_id: string | null;
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as FlagPayload;
    if (!body?.flag_id || !body?.event_id || !body?.flag_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up LoRa channel for this event
    const { data: channel, error: chanErr } = await supabase
      .from("lora_event_channels")
      .select("channel_name, hmac_secret, gateway_url")
      .eq("event_id", body.event_id)
      .maybeSingle();

    if (chanErr) {
      console.error("Channel lookup error:", chanErr);
      return new Response(JSON.stringify({ error: chanErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!channel || !channel.gateway_url) {
      console.log(`No LoRa channel/gateway for event ${body.event_id} — skip`);
      return new Response(JSON.stringify({ ok: true, skipped: "no_gateway" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build downlink envelope (JSON inside Meshtastic TEXT_MESSAGE_APP, gateway wraps in protobuf)
    const downlink = {
      v: 1,
      kind: "flag",
      flag_id: body.flag_id,
      event_id: body.event_id,
      flag_type: body.flag_type,
      message: body.message,
      target_user_id: body.target_user_id,
      session_id: body.session_id,
      ts: Date.now(),
    };

    const bodyStr = JSON.stringify(downlink);
    const signature = await hmacSign(channel.hmac_secret, bodyStr);

    // POST to RAK bridge endpoint with HMAC headers (matches uplink convention)
    const gwRes = await fetch(channel.gateway_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Channel": channel.channel_name,
        "X-Signature": signature,
      },
      body: bodyStr,
    });

    const gwText = await gwRes.text();
    if (!gwRes.ok) {
      console.error(`Gateway error ${gwRes.status}: ${gwText}`);
      return new Response(
        JSON.stringify({ error: "gateway_failed", status: gwRes.status, body: gwText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Flag ${body.flag_id} forwarded to ${channel.gateway_url} (${channel.channel_name})`);
    return new Response(JSON.stringify({ ok: true, gateway_status: gwRes.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("flag-downlink-broadcast error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
