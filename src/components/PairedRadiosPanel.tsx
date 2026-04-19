import { useMemo, useState } from "react";
import { Radio, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PairedRegistration {
  id: string;
  user_name: string;
  car_number: number | null;
  run_group_id: string | null;
  radio_node_id?: string | null;
  radio_last_seen?: string | null;
}

interface RunGroup {
  id: string;
  name: string;
}

interface PairedRadiosPanelProps {
  participants: PairedRegistration[];
  runGroups: RunGroup[];
}

const STALE_MS = 10 * 60 * 1000;

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function statusFor(r: PairedRegistration): "live" | "stale" | "none" {
  if (!r.radio_node_id) return "none";
  if (!r.radio_last_seen) return "stale";
  return Date.now() - new Date(r.radio_last_seen).getTime() <= STALE_MS
    ? "live"
    : "stale";
}

function StatusDot({ s }: { s: "live" | "stale" | "none" }) {
  const cls =
    s === "live"
      ? "bg-green-500 shadow-[0_0_6px] shadow-green-500/60"
      : s === "stale"
        ? "bg-yellow-500"
        : "bg-muted-foreground/40";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

const SIM_NAMES = ["John Smith", "Jane Doe", "Mike Chen", "Carlos Ruiz", "Sam Patel"];
const SIM_NODES = ["!a3b1c9d8", "!b8d4e2f1", "!c1f7e44a", "!d2e5a9b3", "!e9c0d77f"];

const PairedRadiosPanel = ({ participants, runGroups }: PairedRadiosPanelProps) => {
  const [hideUnpaired, setHideUnpaired] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const effectiveParticipants = useMemo<PairedRegistration[]>(() => {
    if (!simulate) return participants;
    const firstGroupId = runGroups[0]?.id ?? null;
    const now = Date.now();
    const fakes: PairedRegistration[] = SIM_NAMES.map((name, i) => ({
      id: `sim-${i}`,
      user_name: name,
      car_number: [42, 17, 8, 23, 99][i],
      run_group_id: i < 3 ? firstGroupId : (runGroups[1]?.id ?? firstGroupId),
      radio_node_id: SIM_NODES[i],
      // mix of fresh, stale, and one missing-last-seen
      radio_last_seen:
        i === 0 ? new Date(now - 30_000).toISOString()
        : i === 1 ? new Date(now - 4 * 60_000).toISOString()
        : i === 2 ? new Date(now - 18 * 60_000).toISOString()
        : i === 3 ? new Date(now - 2 * 60_000).toISOString()
        : new Date(now - 45 * 60_000).toISOString(),
    }));
    return [...participants, ...fakes];
  }, [simulate, participants, runGroups]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, PairedRegistration[]>();
    runGroups.forEach((g) => buckets.set(g.id, []));
    buckets.set("__none__", []);
    effectiveParticipants.forEach((p) => {
      const key = p.run_group_id && buckets.has(p.run_group_id) ? p.run_group_id : "__none__";
      buckets.get(key)!.push(p);
    });
    return buckets;
  }, [effectiveParticipants, runGroups]);

  const totalPaired = effectiveParticipants.filter((p) => !!p.radio_node_id).length;


  const isOpen = (id: string) => openGroups[id] !== false; // default open

  const renderGroup = (id: string, name: string, regs: PairedRegistration[]) => {
    const visible = (hideUnpaired ? regs.filter((r) => !!r.radio_node_id) : regs)
      .slice()
      .sort((a, b) => (a.car_number ?? 9999) - (b.car_number ?? 9999));
    if (regs.length === 0) return null;
    const pairedCount = regs.filter((r) => !!r.radio_node_id).length;
    const open = isOpen(id);

    return (
      <Collapsible
        key={id}
        open={open}
        onOpenChange={(v) => setOpenGroups((s) => ({ ...s, [id]: v }))}
      >
        <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
          <div className="flex items-center gap-2">
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "" : "-rotate-90"}`}
            />
            <span className="text-sm font-semibold">{name}</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {pairedCount}/{regs.length} on radio
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 mb-2 space-y-1">
            {visible.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-2 py-1">
                {hideUnpaired ? "No paired radios in this group." : "No drivers in this group."}
              </p>
            ) : (
              visible.map((r) => {
                const s = statusFor(r);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50 bg-card/60 text-sm"
                  >
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] shrink-0 w-12 justify-center"
                    >
                      #{r.car_number ?? "—"}
                    </Badge>
                    <span className="truncate flex-1 min-w-0">{r.user_name}</span>
                    <StatusDot s={s} />
                    {r.radio_node_id ? (
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                        {r.radio_node_id}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic shrink-0">
                        no radio
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right shrink-0">
                      {r.radio_node_id ? relTime(r.radio_last_seen) : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Radio size={16} className="text-primary" /> Paired Radios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalPaired}/{participants.length} drivers have a radio assigned to this event.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="hide-unpaired" className="text-xs text-muted-foreground cursor-pointer">
            Hide drivers without radio
          </Label>
          <Switch
            id="hide-unpaired"
            checked={hideUnpaired}
            onCheckedChange={setHideUnpaired}
          />
        </div>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No registrations yet.</p>
      ) : totalPaired === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          No radios paired yet for this event. Drivers can pair from <span className="font-medium text-foreground">My Registrations</span>.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {runGroups.map((g) => renderGroup(g.id, g.name, grouped.get(g.id) || []))}
          {renderGroup("__none__", "Unassigned", grouped.get("__none__") || [])}
        </div>
      )}
    </div>
  );
};

export default PairedRadiosPanel;
