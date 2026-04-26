import { BleClient } from "@capacitor-community/bluetooth-le";
import { Capacitor } from "@capacitor/core";
import { decode, encode } from "./encoder";
import {
  decodeFromRadioPacket,
  decodeMyNodeInfo,
  decodePositionFromPacket,
  encodeToRadioPacket,
  PORTNUM_POSITION_APP,
  PORTNUM_TEXT_MESSAGE_APP,
} from "./meshtastic/protobuf";
import { supabase } from "@/integrations/supabase/client";

export const POSITION_SHARE_KEY = "lora_share_position";
function shouldSharePosition(): boolean {
  try {
    const v = localStorage.getItem(POSITION_SHARE_KEY);
    return v === null ? true : v === "true";
  } catch { return true; }
}
import type {
  IncomingMessage,
  LoRaPayload,
  Transport,
  TransportContext,
  TransportStatus,
} from "./types";

/**
 * Talks to a paired Seeed T1000-E (or any Meshtastic-firmware node) over BLE GATT.
 *
 * Wraps our existing JSON-encoded LoRaPayload in a Meshtastic TEXT_MESSAGE_APP
 * payload so the gateway can transparently bridge it to MQTT → our edge function.
 */

const MESHTASTIC_SERVICE = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";
const TORADIO_CHAR = "f75c76d2-129e-4dad-a1dd-7866124401e7";
const FROMRADIO_CHAR = "2c55e69e-4993-11ed-b878-0242ac120002";

export const PAIRED_DEVICE_KEY = "lora_paired_device_id";
export const HARDWARE_FLAG_KEY = "lora_hardware_enabled";

export function getPairedDeviceId(): string | null {
  try { return localStorage.getItem(PAIRED_DEVICE_KEY); } catch { return null; }
}

export function setPairedDeviceId(id: string | null) {
  try {
    if (id) localStorage.setItem(PAIRED_DEVICE_KEY, id);
    else localStorage.removeItem(PAIRED_DEVICE_KEY);
  } catch { /* ignore */ }
}

export function isHardwareEnabled(): boolean {
  try { return localStorage.getItem(HARDWARE_FLAG_KEY) === "true"; } catch { return false; }
}

export function setHardwareEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(HARDWARE_FLAG_KEY, "true");
    else localStorage.removeItem(HARDWARE_FLAG_KEY);
  } catch { /* ignore */ }
}

export function isHardwareCapable(): boolean {
  return Capacitor.isNativePlatform();
}

export class LoRaHardwareTransport implements Transport {
  readonly name = "lora-hw" as const; // distinct from "lora-sim" so logs/UI can differentiate
  private deviceId: string | null;
  private status: TransportStatus = "down";
  private connected = false;
  private subscribers = new Set<(msg: IncomingMessage) => void>();
  private nodeInfoListeners = new Set<(nodeIdHex: string) => void>();
  private connecting: Promise<void> | null = null;

  constructor(private ctx: TransportContext, overrideDeviceId?: string | null) {
    this.deviceId = overrideDeviceId ?? getPairedDeviceId();
  }

  /** Subscribe to MyNodeInfo events (fires on first connect with the radio's hex node id). */
  onNodeInfo(handler: (nodeIdHex: string) => void): () => void {
    this.nodeInfoListeners.add(handler);
    return () => this.nodeInfoListeners.delete(handler);
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    if (this.connecting) return this.connecting;
    if (!this.deviceId) throw new Error("No paired LoRa device");

    this.connecting = (async () => {
      await BleClient.initialize({ androidNeverForLocation: true });
      await BleClient.connect(this.deviceId!, () => {
        this.connected = false;
        this.status = "down";
      });
      // Subscribe to FROMRADIO notifications for inbound packets
      await BleClient.startNotifications(
        this.deviceId!,
        MESHTASTIC_SERVICE,
        FROMRADIO_CHAR,
        (value) => this.onIncoming(new Uint8Array(value.buffer))
      );
      this.connected = true;
      this.status = "connected";
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private lastPositionInsertAt = 0;

  private onIncoming(buf: Uint8Array) {
    // Try MyNodeInfo first (fires once on connect)
    try {
      const info = decodeMyNodeInfo(buf);
      if (info) {
        this.nodeInfoListeners.forEach((h) => h(info.nodeIdHex));
        return;
      }
    } catch { /* ignore */ }

    let decoded: ReturnType<typeof decodeFromRadioPacket> = null;
    try {
      decoded = decodeFromRadioPacket(buf);
    } catch { /* ignore */ }
    if (!decoded) return;

    if (decoded.portnum === PORTNUM_TEXT_MESSAGE_APP) {
      try {
        const text = new TextDecoder().decode(decoded.payload);
        const payload = decode(text);
        const id = `${payload.from}-${payload.ts}`;
        this.subscribers.forEach((h) => h({ id, payload, via: "lora-hw" }));
      } catch { /* malformed app payload */ }
      return;
    }

    if (decoded.portnum === PORTNUM_POSITION_APP) {
      this.handlePositionPacket(decoded);
    }
  }

  private async handlePositionPacket(decoded: { portnum: number; payload: Uint8Array }) {
    if (!shouldSharePosition()) return;
    const now = Date.now();
    if (now - this.lastPositionInsertAt < 10_000) return;
    const pos = decodePositionFromPacket(decoded);
    if (!pos) return;
    this.lastPositionInsertAt = now;
    try {
      await (supabase as any).from("lora_position_fixes").insert({
        event_id: this.ctx.eventId,
        event_registration_id: this.ctx.registrationId ?? null,
        user_id: this.ctx.userId,
        meshtastic_node_id: null,
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude_m: pos.altitudeM ?? null,
        heading_deg: pos.headingDeg ?? null,
        speed_mps: pos.speedMps ?? null,
        fix_time: pos.fixTime?.toISOString() ?? null,
      });
    } catch (err) {
      console.warn("[LoRaHardwareTransport] position insert failed", err);
    }
  }

  async send(payload: LoRaPayload): Promise<string> {
    await this.ensureConnected();
    const json = encode(payload);
    const bytes = new TextEncoder().encode(json);
    const wire = encodeToRadioPacket({ payload: bytes, channel: 0, hopLimit: 3 });
    const dv = new DataView(wire.buffer, wire.byteOffset, wire.byteLength);
    await BleClient.writeWithoutResponse(this.deviceId!, MESHTASTIC_SERVICE, TORADIO_CHAR, dv);
    return `${payload.from}-${payload.ts}`;
  }

  subscribe(handler: (msg: IncomingMessage) => void): () => void {
    this.subscribers.add(handler);
    // Kick off connection lazily
    this.ensureConnected().catch(() => { /* status already set to down */ });
    return () => this.subscribers.delete(handler);
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  destroy() {
    this.subscribers.clear();
    this.nodeInfoListeners.clear();
    if (this.deviceId && this.connected) {
      BleClient.stopNotifications(this.deviceId, MESHTASTIC_SERVICE, FROMRADIO_CHAR).catch(() => {});
      BleClient.disconnect(this.deviceId).catch(() => {});
    }
    this.connected = false;
    this.status = "down";
  }
}
