import { useEffect, useState } from "react";
import { BleClient, type BleDevice } from "@capacitor-community/bluetooth-le";
import { Bluetooth, BluetoothConnected, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  isHardwareCapable,
  LoRaHardwareTransport,
} from "@/lib/transport";
import { POSITION_SHARE_KEY } from "@/lib/transport/LoRaHardwareTransport";

const MESHTASTIC_SERVICE = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

interface PairedRow {
  ble_device_id: string;
  device_name: string | null;
  meshtastic_node_id: string | null;
  last_seen_at: string | null;
}

interface RegistrationRadioPairingProps {
  registrationId: string;
  eventId: string;
  carNumber?: number | null;
}

const RegistrationRadioPairing = ({ registrationId, eventId, carNumber }: RegistrationRadioPairingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paired, setPaired] = useState<PairedRow | null>(null);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hide entire UI on web — BLE only works in Capacitor native
  const supported = isHardwareCapable();

  useEffect(() => {
    if (!supported || !user) { setLoading(false); return; }
    (supabase as any)
      .from("lora_paired_devices")
      .select("ble_device_id, device_name, meshtastic_node_id, last_seen_at")
      .eq("user_id", user.id)
      .eq("event_registration_id", registrationId)
      .maybeSingle()
      .then(({ data }: { data: PairedRow | null }) => {
        setPaired(data);
        setLoading(false);
      });
  }, [user, registrationId, supported]);

  if (!supported) return null;

  const upsertPaired = async (deviceId: string, deviceName: string | null) => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("lora_paired_devices")
      .upsert({
        user_id: user.id,
        event_registration_id: registrationId,
        ble_device_id: deviceId,
        device_name: deviceName,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,event_registration_id" })
      .select("ble_device_id, device_name, meshtastic_node_id, last_seen_at")
      .single();
    if (!error && data) setPaired(data);
    return data;
  };

  const captureNodeId = async (deviceId: string) => {
    if (!user) return;
    // Connect briefly to read MyNodeInfo from FROMRADIO notifications
    const transport = new LoRaHardwareTransport(
      { eventId, userId: user.id, registrationId },
      deviceId,
    );
    const off = transport.onNodeInfo(async (nodeIdHex) => {
      await (supabase as any)
        .from("lora_paired_devices")
        .update({ meshtastic_node_id: nodeIdHex, last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("event_registration_id", registrationId);
      setPaired((p) => p ? { ...p, meshtastic_node_id: nodeIdHex } : p);
      off();
      transport.destroy();
    });
    // Trigger a connection by subscribing
    transport.subscribe(() => {});
    // Auto-teardown after 8s if no MyNodeInfo arrived
    setTimeout(() => { off(); transport.destroy(); }, 8000);
  };

  const handleAssign = async () => {
    setScanning(true);
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      const device: BleDevice = await BleClient.requestDevice({
        services: [MESHTASTIC_SERVICE],
        namePrefix: "Meshtastic",
      });
      const row = await upsertPaired(device.deviceId, device.name ?? "Meshtastic Node");
      toast({ title: "Radio assigned", description: `${device.name ?? device.deviceId}${carNumber ? ` → Car #${carNumber}` : ""}` });
      if (row) captureNodeId(device.deviceId);
    } catch (err) {
      toast({ title: "Pairing cancelled", description: (err as Error).message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const handleUnassign = async () => {
    if (!user) return;
    await (supabase as any)
      .from("lora_paired_devices")
      .delete()
      .eq("user_id", user.id)
      .eq("event_registration_id", registrationId);
    setPaired(null);
    toast({ title: "Radio unassigned" });
  };

  const handleTestPing = async () => {
    if (!user || !paired) return;
    setTesting(true);
    const transport = new LoRaHardwareTransport(
      { eventId, userId: user.id, registrationId },
      paired.ble_device_id,
    );
    try {
      await transport.send({
        t: "msg",
        v: `Ping ${carNumber ? `#${carNumber}` : ""}`.trim(),
        ts: Date.now(),
        from: user.id,
      });
      await (supabase as any)
        .from("lora_paired_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("event_registration_id", registrationId);
      toast({ title: "Test ping sent", description: "Check your radio's screen / serial" });
    } catch (err) {
      toast({ title: "Send failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      transport.destroy();
      setTesting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-2 p-2 rounded-md border border-border/50 bg-card/40">
      {paired ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BluetoothConnected size={14} className="text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{paired.device_name ?? "Paired Node"}</p>
                {paired.meshtastic_node_id && (
                  <p className="text-[10px] text-muted-foreground font-mono">{paired.meshtastic_node_id}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px] shrink-0">RADIO</Badge>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTestPing} disabled={testing}>
              {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Test
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={handleUnassign}>
              <Trash2 size={12} /> Unassign
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-border/40">
            <Label htmlFor={`share-pos-${registrationId}`} className="text-[10px] text-muted-foreground cursor-pointer">
              Share position with race control
            </Label>
            <Switch
              id={`share-pos-${registrationId}`}
              checked={sharePos}
              onCheckedChange={(checked) => {
                setSharePos(checked);
                try { localStorage.setItem(POSITION_SHARE_KEY, String(checked)); } catch { /* ignore */ }
              }}
              className="scale-75"
            />
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={handleAssign} disabled={scanning}>
          {scanning ? <Loader2 size={12} className="animate-spin" /> : <Bluetooth size={12} />} Assign Radio
        </Button>
      )}
    </div>
  );
};

export default RegistrationRadioPairing;
