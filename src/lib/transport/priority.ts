import type { LoRaPayload } from "./types";

/**
 * Priority ordering for LoRa packets. Lower number = higher priority.
 * Race-control flags must beat chatter when the radio link is congested.
 */
const FLAG_PRIORITY: Record<string, number> = {
  red: 0,
  checkered: 1,
  black: 2,
  yellow: 3,
  yellow_turn: 3,
  white: 4,
  green: 5,
  blue: 6,
};

export function priorityFor(payload: LoRaPayload): number {
  if (payload.t === "flag") {
    // payload.v is "<flag_type>|<message?>"
    const flagType = payload.v.split("|")[0];
    return FLAG_PRIORITY[flagType] ?? 5;
  }
  if (payload.t === "ack") return 4;
  // Free-text + gap + everything else lowest
  return 7;
}

/** True for packets that should bypass duty-cycle throttling (life-safety class). */
export function bypassesDutyCycle(payload: LoRaPayload): boolean {
  if (payload.t !== "flag") return false;
  const flagType = payload.v.split("|")[0];
  return flagType === "red" || flagType === "checkered" || flagType === "black";
}
