import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, ChevronRight, Crosshair, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface PositionFix {
  id: string;
  event_registration_id: string | null;
  meshtastic_node_id: string | null;
  user_id: string | null;
  latitude: number;
  longitude: number;
  heading_deg: number | null;
  speed_mps: number | null;
  fix_time: string | null;
  received_at: string;
}

interface ParticipantInfo {
  id: string;
  user_name: string;
  car_number: number | null;
  run_group_id: string | null;
}

interface LiveTrackMapProps {
  eventId: string;
  publicEventId: string | null;
  participants: ParticipantInfo[];
}

const STALE_MS = 30_000;
const HIDE_MS = 120_000;
const RUN_GROUP_HUES = [0, 200, 120, 280, 40, 340, 160, 60];

function colorForRunGroup(runGroupId: string | null, runGroupIdx: Map<string, number>): string {
  if (!runGroupId) return "hsl(0, 0%, 60%)";
  const idx = runGroupIdx.get(runGroupId) ?? 0;
  return `hsl(${RUN_GROUP_HUES[idx % RUN_GROUP_HUES.length]}, 75%, 50%)`;
}

function carIcon(carNumber: number | string, color: string, heading: number | null, opacity: number) {
  const arrow = heading == null
    ? ""
    : `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%) rotate(${heading}deg);transform-origin:50% 28px;">
         <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid ${color};"></div>
       </div>`;
  const html = `
    <div style="position:relative;opacity:${opacity};">
      ${arrow}
      <div style="
        background:${color};
        color:white;
        font-weight:700;
        font-size:12px;
        padding:3px 7px;
        border-radius:10px;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        white-space:nowrap;
        font-family:system-ui,sans-serif;
        line-height:1;
      ">#${carNumber}</div>
    </div>`;
  return L.divIcon({ html, className: "live-car-marker", iconSize: [40, 28], iconAnchor: [20, 14] });
}

function FitBounds({ trigger, points }: { trigger: number; points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (trigger === 0 || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    }
  }, [trigger, points, map]);
  return null;
}

const LiveTrackMap = ({ eventId, publicEventId, participants }: LiveTrackMapProps) => {
  const [open, setOpen] = useState(true);
  const [fixes, setFixes] = useState<Map<string, PositionFix>>(new Map());
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [, forceTick] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Tick every 5s so stale opacity updates visually
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Resolve track center from public_events.track_name → preset_tracks
  useEffect(() => {
    if (!publicEventId) return;
    (async () => {
      const { data: pe } = await supabase
        .from("public_events")
        .select("latitude, longitude, track_name")
        .eq("id", publicEventId)
        .maybeSingle();
      if (pe?.latitude && pe?.longitude) {
        setCenter([Number(pe.latitude), Number(pe.longitude)]);
        return;
      }
      if (pe?.track_name) {
        const { data: track } = await supabase
          .from("preset_tracks")
          .select("latitude, longitude")
          .ilike("name", pe.track_name)
          .maybeSingle();
        if (track?.latitude && track?.longitude) {
          setCenter([Number(track.latitude), Number(track.longitude)]);
        }
      }
    })();
  }, [publicEventId]);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    (async () => {
      const since = new Date(Date.now() - HIDE_MS).toISOString();
      const { data } = await (supabase as any)
        .from("lora_position_fixes")
        .select("*")
        .eq("event_id", eventId)
        .gte("received_at", since)
        .order("received_at", { ascending: false })
        .limit(500);
      if (cancelled || !data) return;
      const map = new Map<string, PositionFix>();
      for (const row of data as PositionFix[]) {
        const key = row.event_registration_id ?? row.meshtastic_node_id ?? row.id;
        if (!map.has(key)) map.set(key, row);
      }
      setFixes(map);
    })();

    const channel = supabase
      .channel(`position-fixes-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lora_position_fixes", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as PositionFix;
          const key = row.event_registration_id ?? row.meshtastic_node_id ?? row.id;
          setFixes((prev) => {
            const next = new Map(prev);
            next.set(key, row);
            return next;
          });
        },
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const runGroupIdx = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const p of participants) {
      if (p.run_group_id && !m.has(p.run_group_id)) m.set(p.run_group_id, i++);
    }
    return m;
  }, [participants]);

  const participantById = useMemo(() => {
    const m = new Map<string, ParticipantInfo>();
    for (const p of participants) m.set(p.id, p);
    return m;
  }, [participants]);

  const now = Date.now();
  const visibleFixes = useMemo(() => {
    const arr: { fix: PositionFix; participant: ParticipantInfo | null; ageMs: number }[] = [];
    fixes.forEach((fix) => {
      const ageMs = now - new Date(fix.received_at).getTime();
      if (ageMs > HIDE_MS) return;
      const participant = fix.event_registration_id ? participantById.get(fix.event_registration_id) ?? null : null;
      arr.push({ fix, participant, ageMs });
    });
    return arr;
  }, [fixes, participantById, now]);

  const points: [number, number][] = visibleFixes.map((v) => [v.fix.latitude, v.fix.longitude]);
  const mapCenter: [number, number] = center ?? (points[0] ?? [39.8283, -98.5795]);
  const initialZoom = center || points.length ? 15 : 4;

  return (
    <Card className="bg-card border-border/60">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span className="font-semibold">Live Track Map</span>
              <Badge variant="secondary" className="text-[10px]">
                {visibleFixes.length} {visibleFixes.length === 1 ? "car" : "cars"}
              </Badge>
            </div>
            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Real-time positions from paired radios. Stale &gt;30s, hidden &gt;2min.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFitTrigger((n) => n + 1)}
                disabled={points.length === 0}
              >
                <Crosshair size={12} className="mr-1" /> Fit all cars
              </Button>
            </div>
            <div className="rounded-md overflow-hidden border border-border/60" style={{ height: 480 }}>
              <MapContainer
                center={mapCenter}
                zoom={initialZoom}
                scrollWheelZoom
                style={{ height: "100%", width: "100%", background: "hsl(var(--muted))" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds trigger={fitTrigger} points={points} />
                {visibleFixes.map(({ fix, participant, ageMs }) => {
                  const carNum = participant?.car_number ?? "?";
                  const color = colorForRunGroup(participant?.run_group_id ?? null, runGroupIdx);
                  const opacity = ageMs > STALE_MS ? 0.5 : 1;
                  const speedMph = fix.speed_mps != null ? Math.round(fix.speed_mps * 2.237) : null;
                  const ageSec = Math.round(ageMs / 1000);
                  return (
                    <Marker
                      key={fix.id}
                      position={[fix.latitude, fix.longitude]}
                      icon={carIcon(carNum, color, fix.heading_deg, opacity)}
                    >
                      <Popup>
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold">#{carNum} {participant?.user_name ?? "Unknown driver"}</div>
                          {speedMph != null && <div>Speed: {speedMph} mph</div>}
                          {fix.heading_deg != null && <div>Heading: {Math.round(fix.heading_deg)}°</div>}
                          <div className="text-muted-foreground">Last fix: {ageSec}s ago</div>
                          {fix.meshtastic_node_id && (
                            <div className="font-mono text-[10px] text-muted-foreground">{fix.meshtastic_node_id}</div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            {visibleFixes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No live positions yet. Cars with paired radios will appear here once GPS fixes start arriving.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default LiveTrackMap;
