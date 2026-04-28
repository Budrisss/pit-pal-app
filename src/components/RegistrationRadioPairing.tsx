import { useEffect, useState } from "react";
import { BluetoothConnected, Loader2, Radio, Send, Trash2 } from "lucide-react";
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
import AssignRadioDialog from "@/components/AssignRadioDialog";

interface PairedRow {
  ble_device_id: string;
  device_name: string | null;
  meshtastic_node_id: string | null;
  radio_label: string | null;
  last_seen_at: string | null;
}

interface RegistrationRadioPairingProps {
  registrationId: string;
  /** This is the linked PUBLIC event id used for allowlist scoping. */
  eventId: string;
  carNumber?: number | null;
  driverName?: string;
}

const RegistrationRadioPairing = ({
  registrationId,
  eventId,
  carNumber,
  driverName,
}: RegistrationRadioPairingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paired, setPaired] = useState<PairedRow | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sharePos, setSharePos] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(POSITION_SHARE_KEY);
      return v === null ? true : v === "true";
    } catch { return true; }
  });

  const fetchPaired = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("lora_paired_devices")
      .select("ble_device_id, device_name, meshtastic_node_id, radio_label, last_seen_at")
      .eq("user_id", user.id)
      .eq("event_registration_id", registrationId)
      .maybeSingle();
    setPaired((data as PairedRow | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchPaired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, registrationId]);

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
    if (!isHardwareCapable()) {
      toast({ title: "Test ping unavailable", description: "BLE testing requires the mobile app." });
      return;
    }
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
    <>
    <AssignRadioDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      registrationId={registrationId}
      driverUserId={user?.id ?? ""}
      driverName={driverName ?? "Driver"}
      carNumber={carNumber ?? null}
      eventId={eventId}
      onPaired={fetchPaired}
    />
    <div className="mt-2 p-2 rounded-md border border-border/50 bg-card/40">
      {paired ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BluetoothConnected size={14} className="text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">
                  {paired.radio_label ?? paired.device_name ?? "Paired Radio"}
                </p>
                {paired.meshtastic_node_id && (
                  <p className="text-[10px] text-muted-foreground font-mono">{paired.meshtastic_node_id}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px] shrink-0">RADIO</Badge>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {isHardwareCapable() ? (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTestPing} disabled={testing}>
                {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Test
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)}>
                Re-pair
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={handleUnassign}>
              <Trash2 size={12} /> Unassign
            </Button>
          </div>
          {isHardwareCapable() && (
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
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-9 w-full text-sm font-semibold"
            onClick={() => setDialogOpen(true)}
          >
            <Radio size={14} className="mr-1.5" />
            Pair Radio{carNumber ? ` for Car #${carNumber}` : ""}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Race control sees your radio status live.
          </p>
        </div>
      )}
    </div>
    </>
  );
};

export default RegistrationRadioPairing;
