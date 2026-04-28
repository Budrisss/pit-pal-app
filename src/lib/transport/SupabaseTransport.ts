import { supabase } from "@/integrations/supabase/client";
import type {
  IncomingMessage,
  LoRaPayload,
  Transport,
  TransportContext,
  TransportStatus,
} from "./types";

/**
 * Production transport — wraps the existing crew_messages table + realtime.
 * Behavior is identical to today's direct Supabase calls.
 */
export class SupabaseTransport implements Transport {
  readonly name = "supabase" as const;
  private status: TransportStatus = "connected";
  private channel: ReturnType<typeof supabase.channel> | null = null;

  constructor(private ctx: TransportContext) {}

  async send(payload: LoRaPayload): Promise<string> {
    // Flag payloads are written to event_flags directly by the organizer UI;
    // the transport layer just acks them so the failover wrapper can mirror to LoRa.
    if (payload.t === "flag") {
      this.status = "connected";
      return `cell-flag-${Date.now()}`;
    }

    const insert = {
      event_id: this.ctx.eventId,
      user_id: this.ctx.userId,
      gap_ahead: payload.t === "gap" ? payload.v : null,
      position: payload.t === "pos" ? payload.v : null,
      message: payload.t === "msg" ? payload.v : null,
    };

    const { data, error } = await supabase
      .from("crew_messages")
      .insert(insert)
      .select("id")
      .single();

    if (error) {
      this.status = "down";
      throw error;
    }
    this.status = "connected";
    return (data as { id: string }).id;
  }

  subscribe(handler: (msg: IncomingMessage) => void): () => void {
    this.channel = supabase
      .channel(`transport-supabase-${this.ctx.eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crew_messages",
          filter: `event_id=eq.${this.ctx.eventId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            user_id: string;
            gap_ahead: string | null;
            position: string | null;
            message: string | null;
            created_at: string;
          };
          const t: LoRaPayload["t"] = row.position
            ? "pos"
            : row.gap_ahead
            ? "gap"
            : "msg";
          const lp: LoRaPayload = {
            t,
            v: (row.position ?? row.gap_ahead ?? row.message ?? "") as string,
            ts: new Date(row.created_at).getTime(),
            from: row.user_id,
          };
          handler({ id: row.id, payload: lp, via: "supabase" });
        }
      )
      .subscribe();
    return () => {
      if (this.channel) supabase.removeChannel(this.channel);
      this.channel = null;
    };
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  destroy() {
    if (this.channel) supabase.removeChannel(this.channel);
    this.channel = null;
  }
}
