/**
 * Singleton store for LoRa sim configuration + packet log.
 * Pure client-side, no persistence beyond localStorage for the feature flag.
 */

import type { LoRaPayload, TransportName } from "./types";

export interface SimNode {
  id: string;
  label: string;
  role: "crew" | "driver" | "organizer";
  /** -120 (no signal) to -40 (excellent) dBm */
  rssi: number;
  inRange: boolean;
  battery: number;
}

export interface PacketLogEntry {
  id: string;
  ts: number;
  from: string;
  to: "broadcast" | string;
  type: LoRaPayload["t"];
  bytes: number;
  latencyMs: number | null;
  via: TransportName;
  delivered: boolean;
  reason?: string;
}

export interface SimConfig {
  /** Mean delivery latency in ms (jittered ±30%) */
  latencyMs: number;
  /** 0..1 packet drop probability */
  dropRate: number;
  /** Hard kill — primary (Supabase) is unavailable */
  cellDown: boolean;
  /** Hard kill — sim gateway is unavailable */
  gatewayDown: boolean;
  /** RSSI floor below which packets always drop */
  rssiFloor: number;
  /** Per-node tracking */
  nodes: SimNode[];
}

export const FEATURE_FLAG_KEY = "lora_sim_enabled";
const MAX_LOG = 200;

const DEFAULT_NODES: SimNode[] = [
  { id: "crew-1", label: "Crew Chief", role: "crew", rssi: -75, inRange: true, battery: 100 },
  { id: "driver-1", label: "Driver", role: "driver", rssi: -82, inRange: true, battery: 100 },
  { id: "organizer-1", label: "Race Control", role: "organizer", rssi: -65, inRange: true, battery: 100 },
];

class SimStore extends EventTarget {
  private _config: SimConfig = {
    latencyMs: 1500,
    dropRate: 0.05,
    cellDown: false,
    gatewayDown: false,
    rssiFloor: -110,
    nodes: DEFAULT_NODES.map((n) => ({ ...n })),
  };
  private _log: PacketLogEntry[] = [];

  get config(): SimConfig {
    return this._config;
  }

  get log(): PacketLogEntry[] {
    return this._log;
  }

  isEnabled(): boolean {
    try {
      return localStorage.getItem(FEATURE_FLAG_KEY) === "true";
    } catch {
      return false;
    }
  }

  setEnabled(enabled: boolean) {
    try {
      if (enabled) localStorage.setItem(FEATURE_FLAG_KEY, "true");
      else localStorage.removeItem(FEATURE_FLAG_KEY);
    } catch {
      /* ignore */
    }
    this.dispatchEvent(new CustomEvent("flag-change"));
  }

  updateConfig(patch: Partial<SimConfig>) {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(new CustomEvent("config-change"));
  }

  updateNode(id: string, patch: Partial<SimNode>) {
    this._config.nodes = this._config.nodes.map((n) =>
      n.id === id ? { ...n, ...patch } : n
    );
    this.dispatchEvent(new CustomEvent("config-change"));
  }

  applyScenario(name: "vir-back" | "njmp-pits" | "full-outage" | "reset") {
    switch (name) {
      case "vir-back":
        this.updateConfig({ latencyMs: 2500, dropRate: 0.25, cellDown: false, gatewayDown: false });
        this._config.nodes = this._config.nodes.map((n) =>
          n.role === "driver" ? { ...n, rssi: -105, inRange: true } : n
        );
        break;
      case "njmp-pits":
        this.updateConfig({ latencyMs: 1200, dropRate: 0.1, cellDown: false, gatewayDown: false });
        this._config.nodes = this._config.nodes.map((n) =>
          n.role === "driver" ? { ...n, rssi: -95, inRange: false } : n
        );
        break;
      case "full-outage":
        this.updateConfig({ latencyMs: 1500, dropRate: 0.05, cellDown: true, gatewayDown: false });
        break;
      case "reset":
        this._config = {
          latencyMs: 1500,
          dropRate: 0.05,
          cellDown: false,
          gatewayDown: false,
          rssiFloor: -110,
          nodes: DEFAULT_NODES.map((n) => ({ ...n })),
        };
        break;
    }
    this.dispatchEvent(new CustomEvent("config-change"));
  }

  logPacket(entry: PacketLogEntry) {
    this._log = [entry, ...this._log].slice(0, MAX_LOG);
    this.dispatchEvent(new CustomEvent("log-change"));
  }

  clearLog() {
    this._log = [];
    this.dispatchEvent(new CustomEvent("log-change"));
  }
}

export const simStore = new SimStore();
