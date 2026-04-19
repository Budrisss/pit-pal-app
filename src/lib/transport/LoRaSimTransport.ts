import { byteSize, encode, decode } from "./encoder";
import { bypassesDutyCycle, priorityFor } from "./priority";
import { simStore } from "./simStore";
import type {
  IncomingMessage,
  LoRaPayload,
  Transport,
  TransportContext,
  TransportStatus,
} from "./types";

/**
 * In-memory LoRaWAN simulator.
 * Uses a singleton EventTarget bus scoped per event so all browser tabs/components
 * sharing this page can receive each other's "radio" packets.
 *
 * Models:
 * - Configurable latency (jittered ±30%)
 * - Drop rate
 * - 1% duty-cycle queue (per node)
 * - RSSI/range gating per node
 */

interface BusPacket {
  id: string;
  raw: string;
  fromUserId: string;
  emittedAt: number;
}

class RadioBus extends EventTarget {
  emit(eventId: string, packet: BusPacket) {
    this.dispatchEvent(new CustomEvent(`packet:${eventId}`, { detail: packet }));
  }
  on(eventId: string, handler: (p: BusPacket) => void) {
    const listener = (e: Event) => handler((e as CustomEvent<BusPacket>).detail);
    this.addEventListener(`packet:${eventId}`, listener);
    return () => this.removeEventListener(`packet:${eventId}`, listener);
  }
}

const bus = new RadioBus();

// Track per-node airtime usage for duty-cycle simulation
const dutyCycleWindow = new Map<string, number[]>(); // userId -> [timestamps in last 1h]
const DUTY_CYCLE_WINDOW_MS = 60 * 60 * 1000; // 1h
const DUTY_CYCLE_LIMIT = 360; // ~1% airtime ≈ 360 short packets/hr (very rough)

function checkDutyCycle(userId: string): boolean {
  const now = Date.now();
  const arr = (dutyCycleWindow.get(userId) ?? []).filter((t) => now - t < DUTY_CYCLE_WINDOW_MS);
  if (arr.length >= DUTY_CYCLE_LIMIT) return false;
  arr.push(now);
  dutyCycleWindow.set(userId, arr);
  return true;
}

function nodeForUser(userId: string) {
  // Simple round-robin: associate the calling user with the first node of matching role.
  // In sim we don't actually know which node is which user — fall back to driver-1.
  const cfg = simStore.config;
  return cfg.nodes.find((n) => n.id.startsWith("driver")) ?? cfg.nodes[0];
}

export class LoRaSimTransport implements Transport {
  readonly name = "lora-sim" as const;
  private unsubBus: (() => void) | null = null;
  private status: TransportStatus = "connected";

  constructor(private ctx: TransportContext) {}

  async send(payload: LoRaPayload): Promise<string> {
    const cfg = simStore.config;
    const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const node = nodeForUser(this.ctx.userId);

    // Compute size (throws if oversized)
    let raw: string;
    let bytes: number;
    try {
      raw = encode(payload);
      bytes = byteSize(payload);
    } catch (err) {
      simStore.logPacket({
        id,
        ts: Date.now(),
        from: this.ctx.userId.slice(0, 8),
        to: "broadcast",
        type: payload.t,
        bytes: byteSize(payload),
        latencyMs: null,
        via: "lora-sim",
        delivered: false,
        reason: (err as Error).message,
      });
      throw err;
    }

    // Gateway down?
    if (cfg.gatewayDown) {
      this.status = "down";
      simStore.logPacket({
        id, ts: Date.now(), from: this.ctx.userId.slice(0, 8), to: "broadcast",
        type: payload.t, bytes, latencyMs: null, via: "lora-sim",
        delivered: false, reason: "Gateway offline",
      });
      throw new Error("LoRa gateway offline");
    }

    // Out of range?
    if (node && (!node.inRange || node.rssi < cfg.rssiFloor)) {
      simStore.logPacket({
        id, ts: Date.now(), from: this.ctx.userId.slice(0, 8), to: "broadcast",
        type: payload.t, bytes, latencyMs: null, via: "lora-sim",
        delivered: false, reason: `RSSI ${node.rssi}dBm out of range`,
      });
      throw new Error(`Node ${node.label} out of range`);
    }

    // Duty cycle exceeded? (life-safety flags bypass)
    if (!bypassesDutyCycle(payload) && !checkDutyCycle(this.ctx.userId)) {
      simStore.logPacket({
        id, ts: Date.now(), from: this.ctx.userId.slice(0, 8), to: "broadcast",
        type: payload.t, bytes, latencyMs: null, via: "lora-sim",
        delivered: false, reason: "Duty cycle limit",
      });
      throw new Error("Duty cycle limit reached");
    }

    // Drop?
    if (Math.random() < cfg.dropRate) {
      simStore.logPacket({
        id, ts: Date.now(), from: this.ctx.userId.slice(0, 8), to: "broadcast",
        type: payload.t, bytes, latencyMs: null, via: "lora-sim",
        delivered: false, reason: "Random packet loss",
      });
      this.status = "degraded";
      throw new Error("Packet dropped (radio loss)");
    }

    // Drain a tick of battery
    if (node) simStore.updateNode(node.id, { battery: Math.max(0, node.battery - 0.05) });

    // Schedule delivery with latency + jitter; high-priority packets cut latency
    const prio = priorityFor(payload);
    const priorityMultiplier = prio <= 2 ? 0.25 : prio <= 4 ? 0.6 : 1.0;
    const jitter = (Math.random() - 0.5) * 0.6 * cfg.latencyMs;
    const latencyMs = Math.max(50, Math.round((cfg.latencyMs + jitter) * priorityMultiplier));
    const emittedAt = Date.now();

    setTimeout(() => {
      bus.emit(this.ctx.eventId, { id, raw, fromUserId: this.ctx.userId, emittedAt });
      simStore.logPacket({
        id,
        ts: Date.now(),
        from: this.ctx.userId.slice(0, 8),
        to: "broadcast",
        type: payload.t,
        bytes,
        latencyMs,
        via: "lora-sim",
        delivered: true,
      });
    }, latencyMs);

    this.status = cfg.dropRate > 0.15 ? "degraded" : "connected";
    return id;
  }

  subscribe(handler: (msg: IncomingMessage) => void): () => void {
    this.unsubBus = bus.on(this.ctx.eventId, (packet) => {
      // Don't echo our own packets back
      if (packet.fromUserId === this.ctx.userId) return;
      try {
        const payload = decode(packet.raw);
        handler({ id: packet.id, payload, via: "lora-sim" });
      } catch {
        /* malformed */
      }
    });
    return () => {
      this.unsubBus?.();
      this.unsubBus = null;
    };
  }

  getStatus(): TransportStatus {
    if (simStore.config.gatewayDown) return "down";
    if (simStore.config.dropRate > 0.15) return "degraded";
    return this.status;
  }

  destroy() {
    this.unsubBus?.();
    this.unsubBus = null;
  }
}
