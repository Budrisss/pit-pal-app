import { FailoverTransport } from "./FailoverTransport";
import {
  getPairedDeviceId,
  isHardwareCapable,
  isHardwareEnabled,
  LoRaHardwareTransport,
} from "./LoRaHardwareTransport";
import { simStore } from "./simStore";
import { SupabaseTransport } from "./SupabaseTransport";
import type { LoRaPayload, Transport, TransportContext } from "./types";

export * from "./types";
export { simStore, FEATURE_FLAG_KEY } from "./simStore";
export { byteSize, encode, decode, MAX_LORA_BYTES } from "./encoder";
export { FailoverTransport } from "./FailoverTransport";
export { priorityFor, bypassesDutyCycle } from "./priority";
export {
  HARDWARE_FLAG_KEY,
  PAIRED_DEVICE_KEY,
  getPairedDeviceId,
  isHardwareCapable,
  isHardwareEnabled,
  setHardwareEnabled,
  setPairedDeviceId,
  LoRaHardwareTransport,
} from "./LoRaHardwareTransport";

/**
 * Factory: returns the right transport for the current environment.
 * - Hardware mode (native + flag + paired device): Failover wrapping real BLE radio
 * - Sim mode (flag): Failover wrapping in-memory radio sim
 * - Otherwise: plain Supabase (production behavior, zero overhead)
 */
export function getCrewTransport(ctx: TransportContext): Transport {
  if (isHardwareCapable() && isHardwareEnabled() && getPairedDeviceId()) {
    return new FailoverTransport(ctx, () => new LoRaHardwareTransport(ctx));
  }
  if (simStore.isEnabled()) {
    return new FailoverTransport(ctx);
  }
  return new SupabaseTransport(ctx);
}

/**
 * Helper: encode an organizer flag insert as a LoRa payload.
 * Wire format: t="flag", v="<flag_type>|<message?>"  (message optional, may be empty).
 */
export function encodeFlagPayload(args: {
  flagType: string;
  message: string | null;
  organizerUserId: string;
}): LoRaPayload {
  const msg = (args.message ?? "").slice(0, 24);
  return {
    t: "flag",
    v: msg ? `${args.flagType}|${msg}` : args.flagType,
    ts: Date.now(),
    from: args.organizerUserId,
  };
}

export function decodeFlagPayload(payload: LoRaPayload): { flagType: string; message: string | null } | null {
  if (payload.t !== "flag") return null;
  const [flagType, ...rest] = payload.v.split("|");
  return { flagType, message: rest.length > 0 ? rest.join("|") : null };
}
