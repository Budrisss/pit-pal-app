import type { LoRaPayload } from "./types";

/** LoRaWAN max application payload at SF7 US915 — realistic hardware ceiling. */
export const MAX_LORA_BYTES = 222;

/**
 * Encode payload to a compact JSON string and enforce the byte cap.
 * Throws if oversized so we catch bad messages now, not after hardware ships.
 */
export function encode(payload: LoRaPayload): string {
  // Truncate sender id to 8 chars (we only need it for dedupe + display)
  const compact = {
    t: payload.t,
    v: payload.v,
    ts: payload.ts,
    f: payload.from.slice(0, 8),
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_LORA_BYTES) {
    throw new Error(
      `LoRa payload exceeds ${MAX_LORA_BYTES} bytes (got ${bytes}). Trim "${payload.v}".`
    );
  }
  return json;
}

export function decode(raw: string): LoRaPayload {
  const obj = JSON.parse(raw);
  return {
    t: obj.t,
    v: obj.v,
    ts: obj.ts,
    from: obj.f ?? obj.from ?? "unknown",
  };
}

export function byteSize(payload: LoRaPayload): number {
  try {
    return new TextEncoder().encode(encode(payload)).length;
  } catch {
    // For oversized payloads, return the raw size so logs still show the truth
    const compact = { t: payload.t, v: payload.v, ts: payload.ts, f: payload.from.slice(0, 8) };
    return new TextEncoder().encode(JSON.stringify(compact)).length;
  }
}
