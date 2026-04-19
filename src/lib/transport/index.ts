import { FailoverTransport } from "./FailoverTransport";
import { simStore } from "./simStore";
import { SupabaseTransport } from "./SupabaseTransport";
import type { LoRaPayload, Transport, TransportContext } from "./types";

export * from "./types";
export { simStore, FEATURE_FLAG_KEY } from "./simStore";
export { byteSize, encode, decode, MAX_LORA_BYTES } from "./encoder";
export { FailoverTransport } from "./FailoverTransport";
export { priorityFor, bypassesDutyCycle } from "./priority";

/**
 * Factory: returns FailoverTransport when the LoRa sim feature flag is on,
 * otherwise the plain SupabaseTransport (production behavior, zero overhead).
 */
export function getCrewTransport(ctx: TransportContext): Transport {
  if (simStore.isEnabled()) {
    return new FailoverTransport(ctx);
  }
  return new SupabaseTransport(ctx);
}

/**
 * Helper: encode an organizer flag insert as a LoRa payload.
 * Wire format: t="flag", v="<flag_type>|<message?>"  (message optional, may be empty).
 * Kept short to fit in 50 bytes — long flag messages get truncated.
 */
export function encodeFlagPayload(args: {
  flagType: string;
  message: string | null;
  organizerUserId: string;
}): LoRaPayload {
  const msg = (args.message ?? "").slice(0, 24); // hard cap so we stay under 50B
  return {
    t: "flag",
    v: msg ? `${args.flagType}|${msg}` : args.flagType,
    ts: Date.now(),
    from: args.organizerUserId,
  };
}

/** Parse a flag payload back into structured form for racer-side rendering. */
export function decodeFlagPayload(payload: LoRaPayload): { flagType: string; message: string | null } | null {
  if (payload.t !== "flag") return null;
  const [flagType, ...rest] = payload.v.split("|");
  return { flagType, message: rest.length > 0 ? rest.join("|") : null };
}
