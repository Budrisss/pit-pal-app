import { LoRaSimTransport } from "./LoRaSimTransport";
import { simStore } from "./simStore";
import { SupabaseTransport } from "./SupabaseTransport";
import type {
  IncomingMessage,
  LoRaPayload,
  Transport,
  TransportContext,
  TransportName,
  TransportStatus,
} from "./types";

const SEND_TIMEOUT_MS = 5000;
const HYSTERESIS_THRESHOLD = 3; // consecutive primary successes needed to switch back

/**
 * Wraps Supabase (primary/cell) + LoRaSim (fallback/radio).
 * - Sends try primary first; on failure or 5s timeout, retry on fallback.
 * - Inbound merges both streams with id-based dedupe.
 * - Hysteresis prevents flapping when cell is intermittently flaky.
 */
export class FailoverTransport implements Transport {
  readonly name = "failover" as const;
  private primary: SupabaseTransport;
  private fallback: LoRaSimTransport;
  private active: TransportName = "supabase";
  private consecutivePrimarySuccesses = 0;
  private dedupe = new Set<string>();
  private statusListeners = new Set<() => void>();

  constructor(ctx: TransportContext, fallbackFactory?: () => Transport) {
    this.primary = new SupabaseTransport(ctx);
    this.fallback = (fallbackFactory ? fallbackFactory() : new LoRaSimTransport(ctx)) as LoRaSimTransport;
  }

  /** Currently-active leg used for last successful send (for the UI badge). */
  getActive(): TransportName {
    if (simStore.config.cellDown) return "lora-sim";
    return this.active;
  }

  onStatusChange(listener: () => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus() {
    this.statusListeners.forEach((l) => {
      try { l(); } catch { /* ignore */ }
    });
  }

  async send(payload: LoRaPayload): Promise<string> {
    const cellDown = simStore.config.cellDown;

    // If cell is killed, go straight to fallback
    if (!cellDown) {
      try {
        const id = await Promise.race([
          this.primary.send(payload),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("Primary send timeout")), SEND_TIMEOUT_MS)
          ),
        ]);
        this.consecutivePrimarySuccesses++;
        if (this.active !== "supabase" && this.consecutivePrimarySuccesses >= HYSTERESIS_THRESHOLD) {
          this.active = "supabase";
          this.emitStatus();
        }
        return id;
      } catch {
        // fall through to fallback
        this.consecutivePrimarySuccesses = 0;
      }
    }

    // Fallback path
    try {
      const id = await this.fallback.send(payload);
      if (this.active !== "lora-sim") {
        this.active = "lora-sim";
        this.emitStatus();
      }
      return id;
    } catch (err) {
      this.emitStatus();
      throw err;
    }
  }

  subscribe(handler: (msg: IncomingMessage) => void): () => void {
    const wrapped = (msg: IncomingMessage) => {
      const dedupeKey = `${msg.payload.from}-${msg.payload.ts}-${msg.payload.t}`;
      if (this.dedupe.has(dedupeKey)) return;
      this.dedupe.add(dedupeKey);
      // Cap dedupe set size
      if (this.dedupe.size > 500) {
        const first = this.dedupe.values().next().value;
        if (first) this.dedupe.delete(first);
      }
      handler(msg);
    };
    const unsubA = this.primary.subscribe(wrapped);
    const unsubB = this.fallback.subscribe(wrapped);
    return () => {
      unsubA();
      unsubB();
    };
  }

  getStatus(): TransportStatus {
    if (simStore.config.cellDown && simStore.config.gatewayDown) return "down";
    if (simStore.config.cellDown) return "degraded";
    return this.primary.getStatus();
  }

  destroy() {
    this.primary.destroy?.();
    this.fallback.destroy?.();
    this.statusListeners.clear();
  }
}
