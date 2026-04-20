import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, RefreshCw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Status = "green" | "yellow" | "red" | "gray";

interface RowProps {
  label: string;
  status: Status;
  value: string;
  hint?: string;
}

const statusDot: Record<Status, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-destructive",
  gray: "bg-muted-foreground/40",
};

const Row = ({ label, status, value, hint }: RowProps) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDot[status])} />
    <span className="text-sm font-medium text-muted-foreground w-28 shrink-0">{label}</span>
    <span className="text-sm text-foreground flex-1 truncate">{value}</span>
    {hint && <span className="text-xs text-muted-foreground hidden sm:block">{hint}</span>}
  </div>
);

interface ConnectivityCheckPanelProps {
  eventId: string;
}

export const ConnectivityCheckPanel = ({ eventId }: ConnectivityCheckPanelProps) => {
  const [open, setOpen] = useState(true);
  const [running, setRunning] = useState(false);

  // Uplink
  const [uplink, setUplink] = useState<{ status: Status; value: string; hint?: string }>({
    status: "gray",
    value: "Checking…",
  });
  // Supabase latency
  const [latency, setLatency] = useState<{ status: Status; value: string; hint?: string }>({
    status: "gray",
    value: "Checking…",
  });
  // Bridge node
  const [bridge, setBridge] = useState<{ status: Status; value: string; hint?: string }>({
    status: "gray",
    value: "Checking…",
  });
  // LoRa channel
  const [channel, setChannel] = useState<{ status: Status; value: string; hint?: string }>({
    status: "gray",
    value: "Checking…",
  });

  const checkUplink = useCallback(async () => {
    if (!navigator.onLine) {
      setUplink({ status: "red", value: "Offline" });
      return;
    }
    const conn: any = (navigator as any).connection;
    let label = "Online";
    let status: Status = "green";
    let hint: string | undefined;

    if (conn) {
      const type = conn.type as string | undefined;
      const eff = conn.effectiveType as string | undefined;
      if (type === "wifi") label = "WiFi";
      else if (type === "ethernet") label = "Ethernet";
      else if (type === "cellular") label = eff ? eff.toUpperCase() : "Cellular";
      else if (eff) label = eff.toUpperCase();

      if (eff === "slow-2g" || eff === "2g") status = "red";
      else if (eff === "3g") status = "yellow";
    }

    // Soft Starlink hint via public IP lookup (best-effort, non-blocking failure)
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const resp = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
      clearTimeout(t);
      if (resp.ok) {
        const data = await resp.json();
        const org = `${data.org || ""} ${data.asn || ""}`.toLowerCase();
        if (org.includes("starlink") || org.includes("spacex")) {
          hint = "Starlink detected";
        }
      }
    } catch {
      // ignore
    }

    setUplink({ status, value: label, hint });
  }, []);

  const checkLatency = useCallback(async () => {
    const start = performance.now();
    try {
      const { error } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();
      const ms = Math.round(performance.now() - start);
      if (error) {
        setLatency({ status: "red", value: "Error", hint: error.message });
        return;
      }
      let status: Status = "green";
      if (ms > 800) status = "red";
      else if (ms > 200) status = "yellow";
      setLatency({ status, value: `${ms}ms`, hint: "just now" });
    } catch (e: any) {
      setLatency({ status: "red", value: "Error", hint: e?.message });
    }
  }, [eventId]);

  const checkBridgeAndChannel = useCallback(async () => {
    // Look up channel via personal event → public_event_id
    const { data: ev } = await supabase
      .from("events")
      .select("public_event_id")
      .eq("id", eventId)
      .maybeSingle();

    const publicEventId = ev?.public_event_id;
    if (!publicEventId) {
      setChannel({ status: "gray", value: "Not configured" });
      setBridge({ status: "gray", value: "Not configured" });
      return;
    }

    const { data: ch } = await supabase
      .from("lora_event_channels")
      .select("channel_name, gateway_url")
      .eq("event_id", publicEventId)
      .maybeSingle();

    if (!ch) {
      setChannel({ status: "gray", value: "Not configured" });
      setBridge({ status: "gray", value: "Not configured" });
      return;
    }

    setChannel({
      status: ch.gateway_url ? "green" : "yellow",
      value: ch.gateway_url ? "Configured" : "No gateway URL",
      hint: ch.channel_name ? `ch: ${ch.channel_name}` : undefined,
    });

    // Bridge proxy: most recent paired-device last_seen on this event
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", publicEventId);

    const regIds = (regs || []).map((r: any) => r.id);
    if (regIds.length === 0) {
      setBridge({ status: "yellow", value: "No registrations yet" });
      return;
    }

    const { data: devices } = await supabase
      .from("lora_paired_devices")
      .select("last_seen_at")
      .in("event_registration_id", regIds)
      .not("last_seen_at", "is", null)
      .order("last_seen_at", { ascending: false })
      .limit(1);

    const last = devices?.[0]?.last_seen_at;
    if (!last) {
      setBridge({ status: "red", value: "Silent", hint: "no beacons received" });
      return;
    }

    const ageMs = Date.now() - new Date(last).getTime();
    const mins = Math.floor(ageMs / 60000);
    let status: Status = "green";
    let value = "Online";
    if (mins > 30) {
      status = "red";
      value = "Silent";
    } else if (mins > 5) {
      status = "yellow";
      value = "Stale";
    }
    const hint =
      mins < 1
        ? `last beacon: ${Math.floor(ageMs / 1000)}s ago`
        : `last beacon: ${mins}m ago`;
    setBridge({ status, value, hint });
  }, [eventId]);

  const runAll = useCallback(async () => {
    setRunning(true);
    await Promise.all([checkUplink(), checkLatency(), checkBridgeAndChannel()]);
    setRunning(false);
  }, [checkUplink, checkLatency, checkBridgeAndChannel]);

  useEffect(() => {
    runAll();
    const id = setInterval(runAll, 30000);
    return () => clearInterval(id);
  }, [runAll]);

  const overall: Status = (() => {
    const all = [uplink.status, latency.status, bridge.status, channel.status];
    if (all.includes("red")) return "red";
    if (all.includes("yellow")) return "yellow";
    if (all.every((s) => s === "gray")) return "gray";
    return "green";
  })();

  const overallLabel =
    overall === "green"
      ? "all systems"
      : overall === "yellow"
        ? "degraded"
        : overall === "red"
          ? "issues detected"
          : "checking";

  return (
    <Card className="bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CollapsibleTrigger className="flex items-center gap-2 text-left flex-1 min-w-0">
              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-base truncate">Connectivity Check</CardTitle>
              {!open && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", statusDot[overall])} />
                  {overallLabel}
                </span>
              )}
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              )}
            </CollapsibleTrigger>
            {open && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  runAll();
                }}
                disabled={running}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
                <span className="ml-1.5 hidden sm:inline">Run check now</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-0.5">
            <Row label="Uplink" status={uplink.status} value={uplink.value} hint={uplink.hint} />
            <Row label="Supabase" status={latency.status} value={latency.value} hint={latency.hint} />
            <Row label="Bridge node" status={bridge.status} value={bridge.value} hint={bridge.hint} />
            <Row label="LoRa channel" status={channel.status} value={channel.value} hint={channel.hint} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ConnectivityCheckPanel;
