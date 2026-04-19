import { useEffect, useState } from "react";
import { simStore, type SimConfig, type PacketLogEntry } from "@/lib/transport/simStore";

/** Re-render when sim config or feature flag changes. */
export function useSimConfig(): { config: SimConfig; enabled: boolean } {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    simStore.addEventListener("config-change", bump);
    simStore.addEventListener("flag-change", bump);
    return () => {
      simStore.removeEventListener("config-change", bump);
      simStore.removeEventListener("flag-change", bump);
    };
  }, []);
  return { config: simStore.config, enabled: simStore.isEnabled() };
}

export function useSimLog(): PacketLogEntry[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    simStore.addEventListener("log-change", bump);
    return () => simStore.removeEventListener("log-change", bump);
  }, []);
  return simStore.log;
}
