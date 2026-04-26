import { useEffect, useState } from "react";
import { BleClient, type BleDevice } from "@capacitor-community/bluetooth-le";
import { Bluetooth, BluetoothConnected, Ear, Loader2, Radio, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getPairedDeviceId,
  HARDWARE_FLAG_KEY,
  isHardwareCapable,
  isHardwareEnabled,
  LoRaHardwareTransport,
  setHardwareEnabled,
  setPairedDeviceId,
} from "@/lib/transport";

const MESHTASTIC_SERVICE = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

const LoRaPairingCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pairedId, setPairedId] = useState<string | null>(getPairedDeviceId());
  const [pairedName, setPairedName] = useState<string | null>(null);
  const [enabled, setEnabledState] = useState<boolean>(isHardwareEnabled());
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastReceived, setLastReceived] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !pairedId) return;
    supabase
      .from("lora_paired_devices")
      .select("device_name")
      .eq("user_id", user.id)
      .eq("ble_device_id", pairedId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.device_name) setPairedName(data.device_name);
      });
  }, [user, pairedId]);

  // Hide entire card on web — BLE only works in Capacitor native
  if (!isHardwareCapable()) return null;

  const handleScan = async () => {
    setScanning(true);
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      const device: BleDevice = await BleClient.requestDevice({
        services: [MESHTASTIC_SERVICE],
        namePrefix: "Meshtastic",
      });
      setPairedDeviceId(device.deviceId);
      setPairedId(device.deviceId);
      setPairedName(device.name ?? "Meshtastic Node");
      if (user) {
        await supabase.from("lora_paired_devices").upsert({
          user_id: user.id,
          ble_device_id: device.deviceId,
          device_name: device.name ?? "Meshtastic Node",
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id,ble_device_id" });
      }
      toast({ title: "Paired", description: device.name ?? device.deviceId });
    } catch (err) {
      toast({
        title: "Pairing cancelled",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleUnpair = async () => {
    if (user && pairedId) {
      await supabase
        .from("lora_paired_devices")
        .delete()
        .eq("user_id", user.id)
        .eq("ble_device_id", pairedId);
    }
    setPairedDeviceId(null);
    setPairedId(null);
    setPairedName(null);
    setEnabledState(false);
    setHardwareEnabled(false);
    toast({ title: "Unpaired" });
  };

  const handleToggle = (v: boolean) => {
    if (v && !pairedId) {
      toast({ title: "Pair a device first", variant: "destructive" });
      return;
    }
    setHardwareEnabled(v);
    setEnabledState(v);
  };

  const handleTest = async () => {
    if (!user || !pairedId) return;
    setTesting(true);
    const transport = new LoRaHardwareTransport({ eventId: "test", userId: user.id });
    try {
      await transport.send({
        t: "msg",
        v: "Hello from app",
        ts: Date.now(),
        from: user.id,
      });
      toast({ title: "Test packet sent", description: "Check the radio's serial log" });
    } catch (err) {
      toast({
        title: "Send failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      transport.destroy();
      setTesting(false);
    }
  };

  const handleListen = async () => {
    if (!user || !pairedId) return;
    setListening(true);
    setLastReceived(null);
    const transport = new LoRaHardwareTransport({ eventId: "test", userId: user.id });
    let received = 0;
    const unsub = transport.subscribe((msg) => {
      received++;
      setLastReceived(JSON.stringify(msg.payload));
      toast({ title: `Packet received (#${received})`, description: `${msg.payload.t}: ${msg.payload.v.slice(0, 60)}` });
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      if (received === 0) {
        toast({ title: "No packets received", description: "Listened for 30s, nothing arrived from the radio.", variant: "destructive" });
      }
    } finally {
      unsub();
      transport.destroy();
      setListening(false);
    }
  };

  return (
    <Card className="bg-gradient-dark border-border/50">
      <CardHeader>
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Radio className="text-primary" size={20} />
          LoRa Radio (Hardware)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          This is your <strong>default radio</strong> — used when you don't have a per-event
          radio assigned. For race day, assign a radio to each car you've registered from{" "}
          <strong>My Registrations</strong> on the Dashboard so organizers know which node
          belongs to which car.
        </p>

        {pairedId ? (
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="flex items-center gap-2">
              <BluetoothConnected size={18} className="text-green-400" />
              <div>
                <p className="text-sm font-medium text-foreground">{pairedName ?? "Paired Node"}</p>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                  {pairedId}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              PAIRED
            </Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bluetooth size={18} />
              <p className="text-sm">No radio paired</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Enable LoRa fallback</p>
            <p className="text-xs text-muted-foreground">
              Stored as <code>{HARDWARE_FLAG_KEY}</code>
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={!pairedId} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Bluetooth size={14} />}
            {pairedId ? "Re-pair" : "Pair Radio"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!pairedId || testing}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send Test
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleListen}
          disabled={!pairedId || listening}
          className="w-full"
        >
          {listening ? <Loader2 size={14} className="animate-spin" /> : <Ear size={14} />}
          {listening ? "Listening (30s)…" : "Listen 30s for incoming"}
        </Button>

        {lastReceived && (
          <div className="rounded-md border border-border/50 bg-muted/30 p-2">
            <p className="text-[10px] text-muted-foreground mb-1">Last packet:</p>
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">{lastReceived}</pre>
          </div>
        )}

        {pairedId && (
          <Button variant="ghost" size="sm" onClick={handleUnpair} className="w-full text-destructive">
            <Trash2 size={14} /> Unpair Radio
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LoRaPairingCard;
