import { useEffect, useState } from "react";
import { BleClient, type BleDevice } from "@capacitor-community/bluetooth-le";
import { Bluetooth, Loader2, Type, Radio as RadioIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  isHardwareCapable,
  LoRaHardwareTransport,
} from "@/lib/transport";

const MESHTASTIC_SERVICE = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  driverUserId: string;
  driverName: string;
  carNumber: number | null;
  eventId: string; // public_events.id used for allowlist scoping
  /** Called after a successful pair so the parent can refresh. */
  onPaired?: () => void;
}

/**
 * Shared "assign a radio to this registration" dialog.
 *
 * - Used by the driver (own registration) and by an organizer (any registration in their event).
 * - Two modes: BLE scan (Capacitor only) and manual node-ID entry (works on web/desktop).
 * - Validates the node id against the event's authorized-radios allowlist when one exists.
 * - Auto-assigns a "Radio N" friendly label scoped to the event.
 */
const AssignRadioDialog = ({
  open,
  onOpenChange,
  registrationId,
  driverUserId,
  driverName,
  carNumber,
  eventId,
  onPaired,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"ble" | "manual">(isHardwareCapable() ? "ble" : "manual");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualId, setManualId] = useState("");
  const [scannedDevice, setScannedDevice] = useState<{
    bleDeviceId: string;
    deviceName: string | null;
  } | null>(null);
  const [namePrefix, setNamePrefix] = useState<string>("TSO-");
  const [allowlist, setAllowlist] = useState<Set<string>>(new Set());
  const [allowlistEnforced, setAllowlistEnforced] = useState(false);

  useEffect(() => {
    if (!open || !eventId) return;
    (async () => {
      // Read event channel for the BLE name prefix
      const { data: chRow } = await (supabase as any)
        .from("lora_event_channels")
        .select("radio_name_prefix")
        .eq("event_id", eventId)
        .maybeSingle();
      if (chRow?.radio_name_prefix) setNamePrefix(chRow.radio_name_prefix);

      // Read allowlist
      const { data: allowRows } = await (supabase as any)
        .from("lora_event_radio_allowlist")
        .select("meshtastic_node_id")
        .eq("event_id", eventId);
      const set = new Set<string>(
        (allowRows || []).map((r: any) => normalizeNodeId(r.meshtastic_node_id)),
      );
      setAllowlist(set);
      setAllowlistEnforced(set.size > 0);
    })();
  }, [open, eventId]);

  const reset = () => {
    setManualId("");
    setScanning(false);
    setSaving(false);
    setScannedDevice(null);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const computeNextLabel = async (): Promise<string> => {
    // Count existing labels for this event so we can pick "Radio N+1"
    const { data: regsForEvent } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId);
    const regIds = (regsForEvent || []).map((r) => r.id);
    if (regIds.length === 0) return "Radio 1";
    const { data: pairs } = await (supabase as any)
      .from("lora_paired_devices")
      .select("radio_label")
      .in("event_registration_id", regIds);
    let max = 0;
    (pairs || []).forEach((p: any) => {
      const m = /^Radio\s+(\d+)$/i.exec(p.radio_label ?? "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `Radio ${max + 1}`;
  };

  const persistPair = async (args: {
    bleDeviceId: string;
    deviceName: string | null;
    nodeIdHex: string | null;
  }) => {
    if (!user) return;
    setSaving(true);
    try {
      const label = await computeNextLabel();
      const { error } = await (supabase as any)
        .from("lora_paired_devices")
        .upsert(
          {
            user_id: driverUserId,
            event_registration_id: registrationId,
            ble_device_id: args.bleDeviceId,
            device_name: args.deviceName,
            meshtastic_node_id: args.nodeIdHex,
            radio_label: label,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,event_registration_id" },
        );
      if (error) throw error;
      toast({
        title: "Radio assigned",
        description: `${label}${carNumber ? ` → Car #${carNumber}` : ""} (${driverName})`,
      });
      onPaired?.();
      handleClose();
    } catch (err) {
      toast({
        title: "Failed to assign radio",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBleScan = async () => {
    if (!isHardwareCapable()) return;
    setScanning(true);
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      const device: BleDevice = await BleClient.requestDevice({
        services: [MESHTASTIC_SERVICE],
        namePrefix: namePrefix || "Meshtastic",
      });

      // Briefly connect to capture the radio's hex node id, then validate
      const transport = new LoRaHardwareTransport(
        { eventId, userId: driverUserId, registrationId },
        device.deviceId,
      );
      let captured = false;
      const off = transport.onNodeInfo(async (nodeIdHex) => {
        if (captured) return;
        captured = true;
        off();
        transport.destroy();
        if (allowlistEnforced && !allowlist.has(normalizeNodeId(nodeIdHex))) {
          toast({
            title: "Radio not authorized",
            description: `${nodeIdHex} isn't on the event's authorized-radios list. Ask the organizer to add it.`,
            variant: "destructive",
          });
          setScanning(false);
          return;
        }
        await persistPair({
          bleDeviceId: device.deviceId,
          deviceName: device.name ?? "Meshtastic Node",
          nodeIdHex,
        });
      });
      // Trigger connect by subscribing
      transport.subscribe(() => {});
      // If we never get MyNodeInfo within 8s, fall back to pairing without it
      setTimeout(async () => {
        if (captured) return;
        captured = true;
        off();
        transport.destroy();
        if (allowlistEnforced) {
          toast({
            title: "Couldn't read radio ID",
            description: "We couldn't read the radio's node ID over BLE, so it can't be checked against the event allowlist.",
            variant: "destructive",
          });
          setScanning(false);
          return;
        }
        await persistPair({
          bleDeviceId: device.deviceId,
          deviceName: device.name ?? "Meshtastic Node",
          nodeIdHex: null,
        });
      }, 8000);
    } catch (err) {
      toast({
        title: "Scan cancelled",
        description: (err as Error).message,
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  const handleManualSave = async () => {
    const cleaned = normalizeNodeId(manualId);
    if (!/^![0-9a-f]{6,8}$/i.test(cleaned)) {
      toast({
        title: "Invalid node ID",
        description: "Node IDs look like !a3b1c9d8 (6-8 hex characters after the !).",
        variant: "destructive",
      });
      return;
    }
    if (allowlistEnforced && !allowlist.has(cleaned)) {
      toast({
        title: "Radio not authorized",
        description: `${cleaned} isn't on the event's authorized-radios list.`,
        variant: "destructive",
      });
      return;
    }
    await persistPair({
      bleDeviceId: scannedDevice?.bleDeviceId ?? `manual:${cleaned}`,
      deviceName: scannedDevice?.deviceName ?? cleaned,
      nodeIdHex: cleaned,
    });
  };

  /**
   * Mobile-only "Scan & Connect" — connect to the radio over BLE just long enough
   * to read its node ID, then auto-fill the manual input so the user can review
   * and confirm before the Car # mapping is saved.
   */
  const handleScanAndConnect = async () => {
    if (!isHardwareCapable()) return;
    setScanning(true);
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      const device: BleDevice = await BleClient.requestDevice({
        services: [MESHTASTIC_SERVICE],
        namePrefix: namePrefix || "Meshtastic",
      });
      const transport = new LoRaHardwareTransport(
        { eventId, userId: driverUserId, registrationId },
        device.deviceId,
      );
      let captured = false;
      const finish = (nodeIdHex: string | null) => {
        if (captured) return;
        captured = true;
        off();
        transport.destroy();
        setScanning(false);
        if (!nodeIdHex) {
          toast({
            title: "Couldn't read node ID",
            description: "Connected, but the radio didn't report its node ID. Enter it manually.",
            variant: "destructive",
          });
          return;
        }
        const cleaned = normalizeNodeId(nodeIdHex);
        setManualId(cleaned);
        setScannedDevice({
          bleDeviceId: device.deviceId,
          deviceName: device.name ?? "Meshtastic Node",
        });
        toast({
          title: "Radio connected",
          description: `Read ${cleaned} from ${device.name ?? "radio"}. Confirm to assign.`,
        });
      };
      const off = transport.onNodeInfo((nodeIdHex) => finish(nodeIdHex));
      transport.subscribe(() => {});
      setTimeout(() => finish(null), 8000);
    } catch (err) {
      toast({
        title: "Scan cancelled",
        description: (err as Error).message,
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Assign Radio {carNumber ? `→ Car #${carNumber}` : ""}
          </DialogTitle>
          <DialogDescription>
            Driver: <span className="font-medium">{driverName}</span>
            {allowlistEnforced && (
              <span className="block mt-1 text-[11px]">
                {allowlist.size} authorized {allowlist.size === 1 ? "radio" : "radios"} for this event.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isHardwareCapable() && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "ble" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("ble")}
            >
              <Bluetooth size={14} className="mr-1" /> Scan nearby
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("manual")}
            >
              <Type size={14} className="mr-1" /> Enter ID
            </Button>
          </div>
        )}

        {mode === "ble" && isHardwareCapable() ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Picker is filtered to radios whose name starts with{" "}
              <code className="font-mono px-1 py-0.5 rounded bg-muted">{namePrefix || "Meshtastic"}</code>.
              Power on the loaner radio first.
            </p>
            <Button onClick={handleBleScan} disabled={scanning || saving} className="w-full">
              {scanning ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Bluetooth size={14} className="mr-1" />}
              {scanning ? "Scanning…" : "Scan & Pair"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="manual-node-id" className="text-xs">Meshtastic Node ID</Label>
            <Input
              id="manual-node-id"
              value={manualId}
              onChange={(e) => {
                setManualId(e.target.value);
                setScannedDevice(null);
              }}
              placeholder="!a3b1c9d8"
              className="font-mono"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground">
              Printed on the loaner radio's label or shown on its screen. The radio just needs to be reachable via the gateway — no BLE pairing required for manual entry.
            </p>
            {isHardwareCapable() && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleScanAndConnect}
                  disabled={scanning || saving}
                >
                  {scanning ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <RadioIcon size={14} className="mr-1" />
                  )}
                  {scanning ? "Connecting…" : "Scan & Connect to read node ID"}
                </Button>
                {scannedDevice && (
                  <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    Connected to {scannedDevice.deviceName} — node ID auto-filled.
                    {carNumber ? ` Will map to Car #${carNumber}.` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={saving || scanning}>
            Cancel
          </Button>
          {mode === "manual" && (
            <Button onClick={handleManualSave} disabled={saving || !manualId.trim()}>
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              Assign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function normalizeNodeId(v: string): string {
  const trimmed = (v ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("!") ? trimmed : `!${trimmed.replace(/^!?/, "")}`;
}

export default AssignRadioDialog;