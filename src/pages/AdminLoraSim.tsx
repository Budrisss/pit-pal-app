import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Radio,
  RadioTower,
  Signal,
  Zap,
  ZapOff,
  Send,
  Trash2,
  Battery,
  RotateCcw,
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useSimConfig, useSimLog } from "@/hooks/useSimStore";
import { simStore, FEATURE_FLAG_KEY } from "@/lib/transport/simStore";
import { byteSize } from "@/lib/transport/encoder";
import { FailoverTransport } from "@/lib/transport/FailoverTransport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const AdminLoraSim = () => {
  const { isAdmin, loading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config, enabled } = useSimConfig();
  const log = useSimLog();
  const [testEvent, setTestEvent] = useState("test-event");
  const [testGap, setTestGap] = useState("+1.2s");
  const [activeLeg, setActiveLeg] = useState<string>("supabase");

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/dashboard");
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const handleSendTest = async () => {
    if (!user) return;
    if (!enabled) {
      toast({ title: "Enable the sim first", variant: "destructive" });
      return;
    }
    const transport = new FailoverTransport({ eventId: testEvent, userId: user.id });
    try {
      await transport.send({ t: "gap", v: testGap, ts: Date.now(), from: user.id });
      setActiveLeg(transport.getActive());
      toast({ title: "Sent", description: `Via ${transport.getActive()}` });
    } catch (err) {
      toast({ title: "Send failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      transport.destroy();
    }
  };

  const transportLabel = config.gatewayDown
    ? "DOWN"
    : config.cellDown
    ? "LoRa Sim 📡"
    : "Cell ✅";
  const transportTone = config.gatewayDown
    ? "border-destructive/60 text-destructive bg-destructive/10"
    : config.cellDown
    ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/10"
    : "border-green-500/60 text-green-400 bg-green-500/10";

  return (
    <div className="min-h-screen bg-gradient-dark p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft size={18} /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <RadioTower className="text-primary" /> LoRa Sim
            </h1>
            <p className="text-xs text-muted-foreground">
              Simulate LoRaWAN failover before hardware arrives
            </p>
          </div>
        </div>
        <Badge className={`${transportTone} text-xs px-3 py-1.5 border font-bold uppercase tracking-wider`}>
          <Radio size={12} className="mr-1.5" /> {transportLabel}
        </Badge>
      </div>

      {/* Feature flag */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Failover Transport</p>
            <p className="text-xs text-muted-foreground">
              When ON, crew→driver messages route through the failover wrapper. OFF = production
              path (Supabase only). Stored in localStorage as <code>{FEATURE_FLAG_KEY}</code>.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => simStore.setEnabled(v)}
          />
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Signal size={16} className="text-primary" /> Radio Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Latency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Latency</Label>
              <span className="text-xs font-mono text-foreground">{config.latencyMs} ms</span>
            </div>
            <Slider
              min={0}
              max={5000}
              step={100}
              value={[config.latencyMs]}
              onValueChange={([v]) => simStore.updateConfig({ latencyMs: v })}
            />
          </div>

          {/* Drop rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Packet Drop Rate</Label>
              <span className="text-xs font-mono text-foreground">
                {(config.dropRate * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[config.dropRate * 100]}
              onValueChange={([v]) => simStore.updateConfig({ dropRate: v / 100 })}
            />
          </div>

          {/* Kill switches */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={config.cellDown ? "destructive" : "outline"}
              size="sm"
              onClick={() => simStore.updateConfig({ cellDown: !config.cellDown })}
              className="justify-start"
            >
              {config.cellDown ? <ZapOff size={14} /> : <Zap size={14} />}
              {config.cellDown ? "Cell DOWN" : "Cell up"}
            </Button>
            <Button
              variant={config.gatewayDown ? "destructive" : "outline"}
              size="sm"
              onClick={() => simStore.updateConfig({ gatewayDown: !config.gatewayDown })}
              className="justify-start"
            >
              {config.gatewayDown ? <ZapOff size={14} /> : <Zap size={14} />}
              {config.gatewayDown ? "Gateway DOWN" : "Gateway up"}
            </Button>
          </div>

          {/* Scenarios */}
          <div>
            <Label className="text-xs mb-2 block">Scenario Presets</Label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => simStore.applyScenario("vir-back")}>
                VIR back straight
              </Button>
              <Button size="sm" variant="secondary" onClick={() => simStore.applyScenario("njmp-pits")}>
                NJMP pit dead zone
              </Button>
              <Button size="sm" variant="secondary" onClick={() => simStore.applyScenario("full-outage")}>
                Full cell outage
              </Button>
              <Button size="sm" variant="ghost" onClick={() => simStore.applyScenario("reset")}>
                <RotateCcw size={12} /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtual nodes */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Virtual Nodes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.nodes.map((node) => (
            <div key={node.id} className="rounded-lg border border-border/30 bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{node.label}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {node.role} · {node.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    <Battery size={10} className="mr-1" /> {node.battery.toFixed(0)}%
                  </Badge>
                  <Switch
                    checked={node.inRange}
                    onCheckedChange={(v) => simStore.updateNode(node.id, { inRange: v })}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[10px] text-muted-foreground">RSSI</Label>
                  <span className="text-[10px] font-mono">{node.rssi} dBm</span>
                </div>
                <Slider
                  min={-120}
                  max={-40}
                  step={1}
                  value={[node.rssi]}
                  onValueChange={([v]) => simStore.updateNode(node.id, { rssi: v })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Test sender */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send size={16} className="text-primary" /> Test Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Event ID (or test-event)</Label>
              <Input value={testEvent} onChange={(e) => setTestEvent(e.target.value)} className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Gap value</Label>
              <Input value={testGap} onChange={(e) => setTestGap(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">
              Payload size: <span className="font-mono">{byteSize({ t: "gap", v: testGap, ts: Date.now(), from: user?.id ?? "x" })}</span>/50 B
            </p>
            <Button size="sm" onClick={handleSendTest}>
              <Send size={14} /> Send via Failover
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Last successful leg: <span className="font-mono text-foreground">{activeLeg}</span>
          </p>
        </CardContent>
      </Card>

      {/* Packet log */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Packet Log ({log.length})</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => simStore.clearLog()}>
            <Trash2 size={12} /> Clear
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px]">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No packets yet — send a test or wait for traffic.</p>
            ) : (
              <div className="space-y-1 font-mono text-[11px]">
                {log.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded ${
                      p.delivered ? "bg-green-500/5" : "bg-destructive/5"
                    }`}
                  >
                    <span className="text-muted-foreground w-20 shrink-0">
                      {new Date(p.ts).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <span className="text-foreground w-16 shrink-0 truncate">{p.from}</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 shrink-0 uppercase">{p.type}</Badge>
                    <span className="text-muted-foreground w-12 shrink-0">{p.bytes}B</span>
                    <span className="text-muted-foreground w-20 shrink-0">
                      {p.latencyMs !== null ? `${p.latencyMs}ms` : "—"}
                    </span>
                    <span className="text-muted-foreground w-20 shrink-0 truncate">{p.via}</span>
                    <span className={`flex-1 truncate ${p.delivered ? "text-green-400" : "text-destructive"}`}>
                      {p.delivered ? "✓ delivered" : `✗ ${p.reason ?? "dropped"}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoraSim;
