/**
 * Transport abstraction for crew/driver messaging.
 * Allows swapping between Supabase realtime (cell) and LoRaWAN sim (radio fallback).
 */

export type LoRaPayloadType = "gap" | "msg" | "flag" | "ack";

/** Compact wire format — must encode to <=50 bytes (LoRaWAN constraint). */
export interface LoRaPayload {
  /** Type discriminator — single char on wire */
  t: LoRaPayloadType;
  /** Value — string body (e.g. "+1.2", "Pit now", "yellow") */
  v: string;
  /** Unix ms timestamp */
  ts: number;
  /** Sender id (truncated to 8 chars on wire) */
  from: string;
}

export interface IncomingMessage {
  id: string;
  payload: LoRaPayload;
  /** Which transport delivered this message */
  via: TransportName;
}

export type TransportName = "supabase" | "lora-sim" | "lora-hw" | "failover";

export type TransportStatus = "connected" | "degraded" | "down";

export interface TransportContext {
  eventId: string;
  userId: string;
  /** Optional registration id — used to resolve a per-registration paired radio. */
  registrationId?: string;
}

export interface Transport {
  readonly name: TransportName;
  /** Send a payload. Resolves with the assigned id on success. */
  send(payload: LoRaPayload): Promise<string>;
  /** Subscribe to incoming messages. Returns an unsubscribe fn. */
  subscribe(handler: (msg: IncomingMessage) => void): () => void;
  /** Current connection state */
  getStatus(): TransportStatus;
  /** Optional teardown */
  destroy?(): void;
}
