import { useState, useEffect } from "react";
import { Radio, RefreshCw, Copy, Check, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EventOption {
  id: string;
  name: string;
  date: string;
}

interface ChannelMapping {
  id: string;
  event_id: string;
  channel_name: string;
  hmac_secret: string;
  gateway_url: string | null;
  updated_at: string;
}

// Generate a URL-safe random token (base64url, no padding)
const genToken = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);

export default function LoRaChannelCard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [mapping, setMapping] = useState<ChannelMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [gatewayUrlInput, setGatewayUrlInput] = useState("");
  const [savingGw, setSavingGw] = useState(false);

  // Load events organized by this user
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get organizer profile, then their public events
      const { data: profile } = await supabase
        .from("organizer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;

      const { data: evts } = await supabase
        .from("public_events")
        .select("id, name, date")
        .eq("organizer_id", profile.id)
        .order("date", { ascending: false })
        .limit(50);
      if (evts) setEvents(evts);
    })();
  }, [user]);

  // Load mapping for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setMapping(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("lora_event_channels")
        .select("id, event_id, channel_name, hmac_secret, gateway_url, updated_at")
        .eq("event_id", selectedEventId)
        .maybeSingle();
      setMapping(data ?? null);
      setGatewayUrlInput(data?.gateway_url ?? "");
    })();
  }, [selectedEventId]);

  const handleCreate = async () => {
    if (!selectedEventId || !user) return;
    const evt = events.find((e) => e.id === selectedEventId);
    if (!evt) return;
    setLoading(true);
    const channel_name = `${slugify(evt.name)}-${slugify(evt.date).replace(/-/g, "")}`.slice(0, 32);
    const hmac_secret = genToken(32);

    const { data, error } = await supabase
      .from("lora_event_channels")
      .insert({
        event_id: selectedEventId,
        organizer_user_id: user.id,
        channel_name,
        hmac_secret,
      })
      .select("id, event_id, channel_name, hmac_secret, gateway_url, updated_at")
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Failed to create channel", description: error.message, variant: "destructive" });
      return;
    }
    setMapping(data);
    toast({ title: "LoRa channel created", description: `Channel "${channel_name}" is ready.` });
  };

  const handleRotateSecret = async () => {
    if (!mapping) return;
    if (!confirm("Rotate HMAC secret? You'll need to update the RAK gateway env var with the new value.")) return;
    setLoading(true);
    const new_secret = genToken(32);
    const { data, error } = await supabase
      .from("lora_event_channels")
      .update({ hmac_secret: new_secret, updated_at: new Date().toISOString() })
      .eq("id", mapping.id)
      .select("id, event_id, channel_name, hmac_secret, gateway_url, updated_at")
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Failed to rotate", description: error.message, variant: "destructive" });
      return;
    }
    setMapping(data);
    toast({ title: "Secret rotated", description: "Update the RAK gateway env var ASAP." });
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const uplinkUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meshtastic-uplink`;

  const envBlock = mapping
    ? `# /etc/trackside-bridge.env
TRACKSIDE_UPLINK_URL=${uplinkUrl}
TRACKSIDE_CHANNEL_NAME=${mapping.channel_name}
TRACKSIDE_HMAC_SECRET=${mapping.hmac_secret}
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_TOPIC=msh/+/+/+/+`
    : "";

  return (
    <Card className="bg-gradient-dark border-border/50">
      <CardHeader>
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Radio className="text-primary" size={20} />
          LoRa Channel (per Event)
          <Badge variant="secondary" className="ml-auto text-xs">Hardware</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Generate a Meshtastic channel and HMAC secret for an event. Paste the env block into the RAK7289v2 gateway's bridge config.
        </p>

        <div className="space-y-2">
          <Label>Event</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an event…" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} — {e.date}
                </SelectItem>
              ))}
              {events.length === 0 && (
                <SelectItem value="none" disabled>No events yet</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedEventId && !mapping && (
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            <Plus size={16} className="mr-2" />
            {loading ? "Creating…" : "Create LoRa Channel"}
          </Button>
        )}

        {mapping && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Channel Name</Label>
              <div className="flex gap-2">
                <Input value={mapping.channel_name} readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copy("channel", mapping.channel_name)}
                >
                  {copied === "channel" ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">HMAC Secret</Label>
              <div className="flex gap-2">
                <Input value={mapping.hmac_secret} readOnly type="password" className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copy("secret", mapping.hmac_secret)}
                >
                  {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(mapping.updated_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Gateway Env Block</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copy("env", envBlock)}
                >
                  {copied === "env" ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                  Copy
                </Button>
              </div>
              <pre className="bg-muted/40 border border-border rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">
{envBlock}
              </pre>
              <p className="text-xs text-muted-foreground">
                SSH into the RAK gateway, save this as <code>/etc/trackside-bridge.env</code>, then restart the bridge service.
              </p>
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={handleRotateSecret}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw size={16} className="mr-2" />
              {loading ? "Rotating…" : "Rotate HMAC Secret (Daily)"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
