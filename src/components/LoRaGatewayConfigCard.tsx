import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, Radio, Loader2, RefreshCw, Send, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  /**
   * Either a public_events.id (organizer-managed event) or a personal events.id
   * (which we'll resolve to its linked public_event_id, if any).
   */
  eventId: string;
}

function genHexSecret(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const LoRaGatewayConfigCard = ({ eventId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [publicEventId, setPublicEventId] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);

  const [channelName, setChannelName] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [hmacSecret, setHmacSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // First check if this id is itself a public_events row (organizer is
        // managing a published event directly).
        const { data: pub } = await supabase
          .from("public_events")
          .select("id")
          .eq("id", eventId)
          .maybeSingle();
        let peid: string | null = pub?.id ?? null;

        // Fallback: treat it as a personal events.id and resolve its linked
        // public_event_id (if any).
        if (!peid) {
          const { data: ev } = await supabase
            .from("events")
            .select("public_event_id")
            .eq("id", eventId)
            .maybeSingle();
          peid = ev?.public_event_id ?? null;
        }

        if (!active) return;
        setPublicEventId(peid);
        if (!peid) { setLoading(false); return; }

        const { data: row } = await (supabase as any)
          .from("lora_event_channels")
          .select("id, channel_name, gateway_url, hmac_secret")
          .eq("event_id", peid)
          .maybeSingle();
        if (!active) return;
        if (row) {
          setRowId(row.id);
          setChannelName(row.channel_name ?? "");
          setGatewayUrl(row.gateway_url ?? "");
          setHmacSecret(row.hmac_secret ?? "");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [eventId]);

  const configured = !!rowId && !!gatewayUrl && !!hmacSecret && !!channelName;

  const handleSave = async () => {
    if (!publicEventId || !user) return;
    if (!channelName || !gatewayUrl || !hmacSecret) {
      toast({ title: "Missing fields", description: "Channel, URL and HMAC secret are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        event_id: publicEventId,
        organizer_user_id: user.id,
        channel_name: channelName.trim(),
        gateway_url: gatewayUrl.trim(),
        hmac_secret: hmacSecret.trim(),
      };
      let res;
      if (rowId) {
        res = await (supabase as any).from("lora_event_channels").update(payload).eq("id", rowId).select().maybeSingle();
      } else {
        res = await (supabase as any).from("lora_event_channels").insert(payload).select().maybeSingle();
      }
      if (res.error) throw res.error;
      if (res.data?.id) setRowId(res.data.id);
      toast({ title: "Saved", description: "Gateway config stored." });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!publicEventId) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Fire the edge function directly with a synthetic test envelope (no DB write).
      const { data, error } = await supabase.functions.invoke("flag-downlink-broadcast", {
        body: {
          flag_id: `test-${Date.now()}`,
          event_id: publicEventId,
          flag_type: "test",
          message: "ping from gateway config card",
          target_user_id: null,
          session_id: null,
        },
      });
      if (error) throw error;
      setTestResult(JSON.stringify(data));
      toast({ title: "Test sent", description: "Bridge replied — check radio serial log." });
    } catch (err) {
      const msg = (err as Error).message;
      setTestResult(`Error: ${msg}`);
      toast({ title: "Test failed", description: msg, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  // Personal event without a public event link → can't broadcast flags.
  if (!loading && !publicEventId) {
    return (
      <Card className="bg-gradient-dark border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio size={16} className="text-primary" /> LoRa Gateway
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-xs">
              LoRa flag broadcast is only available on published organizer events. This personal event isn't linked to a public event, so flag downlink won't reach the gateway.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-dark border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 hover:bg-muted/20 transition-colors rounded-t-lg">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Radio size={16} className="text-primary" />
                LoRa Gateway
                {!loading && (
                  <Badge
                    variant={configured ? "default" : "outline"}
                    className={`text-[10px] ${configured ? "bg-green-600 hover:bg-green-600" : ""}`}
                  >
                    {configured ? "Configured" : "Not configured"}
                  </Badge>
                )}
              </span>
              <ChevronDown size={16} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground">
              When you raise a flag, the server signs a downlink packet with the HMAC secret below and POSTs it to your RAK gateway URL. The gateway broadcasts it over LoRa to paired racer phones.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="lora-channel" className="text-xs">Channel name</Label>
                  <Input
                    id="lora-channel"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="e.g. trackside-main"
                  />
                  <p className="text-[10px] text-muted-foreground">Must match the channel name configured in the RAK / Mosquitto bridge.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lora-url" className="text-xs">Gateway URL</Label>
                  <Input
                    id="lora-url"
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    placeholder="https://gateway.example.com/downlink"
                    type="url"
                  />
                  <p className="text-[10px] text-muted-foreground">Public HTTPS URL of the RAK7289v2 bridge endpoint.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lora-secret" className="text-xs">HMAC secret</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="lora-secret"
                      value={hmacSecret}
                      onChange={(e) => setHmacSecret(e.target.value)}
                      placeholder="32-byte hex secret"
                      type={showSecret ? "text" : "password"}
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)} title={showSecret ? "Hide" : "Show"}>
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => setHmacSecret(genHexSecret())} title="Generate new secret">
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Paste the same value into your bridge config so signatures verify.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Save
                  </Button>
                  <Button onClick={handleTest} disabled={!configured || testing} variant="outline" size="sm">
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send test packet
                  </Button>
                </div>

                {testResult && (
                  <div className="rounded-md border border-border/50 bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Bridge response:</p>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">{testResult}</pre>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default LoRaGatewayConfigCard;