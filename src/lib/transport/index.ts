import { FailoverTransport } from "./FailoverTransport";
import { simStore } from "./simStore";
import { SupabaseTransport } from "./SupabaseTransport";
import type { Transport, TransportContext } from "./types";

export * from "./types";
export { simStore, FEATURE_FLAG_KEY } from "./simStore";
export { byteSize, encode, decode, MAX_LORA_BYTES } from "./encoder";
export { FailoverTransport } from "./FailoverTransport";

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
