import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ChevronDown, ShieldCheck, Trash2, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  /** public_events.id */
  publicEventId: string;
}

interface AllowRow {
  id: string;
  meshtastic_node_id: string;
  label: string | null;
  notes: string | null;
}

const EventRadioAllowlistCard = ({ publicEventId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AllowRow[]>([]);
  const [bulk, setBulk] = useState("");
  const [singleId, setSingleId] = useState("");
  const [singleLabel, setSingleLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("lora_event_radio_allowlist")
      .select("id, meshtastic_node_id, label, notes")
      .eq("event_id", publicEventId)
      .order("created_at", { ascending: true });
    setRows((data as AllowRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (publicEventId) fetchRows();
  }, [publicEventId]);

  const addNodeIds = async (ids: { node: string; label?: string }[]) => {
    if (!user || ids.length === 0) return;
    setSaving(true);
    try {
      const payload = ids
        .map((x) => ({
          event_id: publicEventId,
          meshtastic_node_id: normalizeNodeId(x.node),
          label: x.label?.trim() || null,
          added_by: user.id,
        }))
        .filter((p) => /^![0-9a-f]{6,8}$/i.test(p.meshtastic_node_id));
      if (payload.length === 0) {
        toast({ title: "No valid node IDs", description: "IDs look like !a3b1c9d8", variant: "destructive" });
        setSaving(false);
        return;
      }
      const { error } = await (supabase as any)
        .from("lora_event_radio_allowlist")
        .upsert(payload, { onConflict: "event_id,meshtastic_node_id" });
      if (error) throw error;
      toast({ title: `${payload.length} radio(s) authorized` });
      setBulk("");
      setSingleId("");
      setSingleLabel("");
      await fetchRows();
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSingle = () => {
    if (!singleId.trim()) return;
    addNodeIds([{ node: singleId, label: singleLabel }]);
  };

  const handleBulkImport = () => {
    const lines = bulk
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter(Boolean);
    addNodeIds(lines.map((node) => ({ node })));
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from("lora_event_radio_allowlist")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <Card className="bg-gradient-dark border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 hover:bg-muted/20 transition-colors rounded-t-lg">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                Authorized Radios
                <Badge
                  variant={rows.length > 0 ? "default" : "outline"}
                  className={`text-[10px] ${rows.length > 0 ? "bg-green-600 hover:bg-green-600" : ""}`}
                >
                  {rows.length === 0 ? "Open (any radio)" : `${rows.length} authorized`}
                </Badge>
              </span>
              <ChevronDown size={16} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground">
              Lock down your event so only the radios you bring (or hand out) can pair and send packets. When the list is empty, any Meshtastic radio nearby can pair. Add at least one node ID to enforce strict mode.
            </p>

            {/* Single add */}
            <div className="space-y-2 rounded-md border border-border/40 p-3">
              <Label className="text-xs">Add a radio</Label>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  placeholder="!a3b1c9d8"
                  className="font-mono text-xs"
                />
                <Input
                  value={singleLabel}
                  onChange={(e) => setSingleLabel(e.target.value)}
                  placeholder="Label (e.g. Loaner #3)"
                  className="text-xs"
                />
                <Button size="sm" onClick={handleAddSingle} disabled={saving}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            {/* Bulk add */}
            <div className="space-y-2 rounded-md border border-border/40 p-3">
              <Label className="text-xs">Bulk import</Label>
              <Textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={"!a3b1c9d8\n!b8d4e2f1\n!c1f7e44a"}
                rows={4}
                className="font-mono text-xs"
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">One node ID per line, comma-separated also OK.</p>
                <Button size="sm" variant="outline" onClick={handleBulkImport} disabled={saving || !bulk.trim()}>
                  {saving ? <Loader2 size={12} className="mr-1 animate-spin" /> : null}
                  Import
                </Button>
              </div>
            </div>

            {/* Current list */}
            <div className="space-y-1">
              <Label className="text-xs">Current allowlist</Label>
              {loading ? (
                <p className="text-xs text-muted-foreground italic px-2 py-3">Loading…</p>
              ) : rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2 py-3">
                  No radios authorized yet — strict mode disabled.
                </p>
              ) : (
                <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50 bg-card/60"
                    >
                      <span className="font-mono text-[11px] flex-1 truncate">{r.meshtastic_node_id}</span>
                      {r.label && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[40%]">{r.label}</span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

function normalizeNodeId(v: string): string {
  const trimmed = (v ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("!") ? trimmed : `!${trimmed.replace(/^!?/, "")}`;
}

export default EventRadioAllowlistCard;