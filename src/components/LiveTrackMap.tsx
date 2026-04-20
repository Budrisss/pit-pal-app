import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Crosshair, Minus, Plus, Radio, Target, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
  participants: ParticipantInfo[];
  fullscreen?: boolean;
}

interface TrackInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geojson: any | null;
}

const STALE_MS = 30_000;
const HIDE_MS = 120_000;
const RUN_GROUP_HUES = [0, 200, 120, 280, 40, 340, 160, 60];

function colorForRunGroup(runGroupId: string | null, runGroupIdx: Map<string, number>): string {
  if (!runGroupId) return "hsl(0, 0%, 70%)";
  const idx = runGroupIdx.get(runGroupId) ?? 0;
  return `hsl(${RUN_GROUP_HUES[idx % RUN_GROUP_HUES.length]}, 80%, 55%)`;
}

function carIcon(carNumber: number | string, color: string, heading: number | null, stale: boolean) {
  const ringStyle = stale
    ? `border:2px dashed ${color};`
    : `border:2px solid ${color}; box-shadow:0 0 8px ${color}80, 0 2px 6px rgba(0,0,0,0.6);`;
  const arrow = heading == null
    ? ""
    : `<div style="position:absolute;top:50%;left:50%;width:0;height:0;transform:translate(-50%,-50%) rotate(${heading}deg);">
         <div style="position:absolute;top:-22px;left:-5px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${color};filter:drop-shadow(0 0 3px ${color});"></div>
       </div>`;
  const html = `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      ${arrow}
      <div style="
        background:hsl(220 13% 9% / 0.95);
        color:white;
        font-weight:800;
        font-size:11px;
        padding:3px 6px;
        clip-path: polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%);
        ${ringStyle}
        white-space:nowrap;
        font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
        line-height:1;
        letter-spacing:0.5px;
      ">${carNumber}</div>
    </div>`;
  return L.divIcon({ html, className: "live-car-marker", iconSize: [36, 36], iconAnchor: [18, 18] });
}

function startFinishIcon() {
  const html = `<div style="
    width:14px;height:14px;
    background:repeating-conic-gradient(white 0 25%, black 0 50%) 50%/6px 6px;
    border:2px solid hsl(var(--f1-red));
    border-radius:3px;
    box-shadow:0 0 6px hsl(var(--f1-red) / 0.8);
  "></div>`;
  return L.divIcon({ html, className: "live-car-marker", iconSize: [14, 14], iconAnchor: [7, 7] });
}

function FitBounds({ trigger, points, trackId, framedRef }: { trigger: number; points: [number, number][]; trackId: string | null; framedRef: React.MutableRefObject<string | null> }) {
  const map = useMap();
  useEffect(() => {
    if (trigger === 0 || points.length === 0) return;
    if (trackId && framedRef.current === trackId) return;
    if (points.length === 1) map.setView(points[0], 16);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    if (trackId) framedRef.current = trackId;
  }, [trigger, points, map, trackId, framedRef]);
  return null;
}

function RecenterOnTrack({ trackId, center, framedRef }: { trackId: string | null; center: [number, number] | null; framedRef: React.MutableRefObject<string | null> }) {
  const map = useMap();
  useEffect(() => {
    if (!trackId || !center) return;
    if (framedRef.current === trackId) return;
    map.setView(center, 15, { animate: true });
    framedRef.current = trackId;
  }, [trackId, center, map, framedRef]);
  return null;
}

function FollowLeader({ enabled, point }: { enabled: boolean; point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !point) return;
    map.panTo(point, { animate: true, duration: 0.6 });
  }, [enabled, point, map]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-9 h-9 rounded-md bg-card/90 backdrop-blur border border-border/60 hover:bg-card hover:border-primary/50 transition-colors flex items-center justify-center text-foreground shadow-lg"
        aria-label="Zoom in"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-9 h-9 rounded-md bg-card/90 backdrop-blur border border-border/60 hover:bg-card hover:border-primary/50 transition-colors flex items-center justify-center text-foreground shadow-lg"
        aria-label="Zoom out"
      >
        <Minus size={16} />
      </button>
    </div>
  );
}

// Approximate length in miles from polyline coords
function polylineLengthMi(coords: [number, number][]): number {
  let m = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lon1] = coords[i - 1];
    const [lat2, lon2] = coords[i];
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    m += 2 * R * Math.asin(Math.sqrt(a));
  }
  return m / 1609.344;
}

const LiveTrackMap = ({ eventId, participants, fullscreen = false }: LiveTrackMapProps) => {
  const [open, setOpen] = useState(true);
  const [fixes, setFixes] = useState<Map<string, PositionFix>>(new Map());
  const [eventTrackId, setEventTrackId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [trackCoords, setTrackCoords] = useState<[number, number][]>([]);
  const [presets, setPresets] = useState<{ id: string; name: string }[]>([]);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [followLeader, setFollowLeader] = useState(false);
  const [hasAutoFit, setHasAutoFit] = useState(false);
  const [trackPickerOpen, setTrackPickerOpen] = useState(false);
  const [, forceTick] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const framedTrackRef = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Load preset tracks list once
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("preset_tracks")
        .select("id, name")
        .order("name", { ascending: true });
      if (data) setPresets(data);
    })();
  }, []);

  // Resolve event's default track id
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("public_event_id")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev?.public_event_id) return;
      const { data: pe } = await supabase
        .from("public_events")
        .select("track_name")
        .eq("id", ev.public_event_id)
        .maybeSingle();
      if (!pe?.track_name) return;
      const { data: presetTrack } = await (supabase as any)
        .from("preset_tracks")
        .select("id")
        .ilike("name", pe.track_name)
        .maybeSingle();
      if (cancelled || !presetTrack?.id) return;
      setEventTrackId(presetTrack.id);
      setSelectedTrackId((cur) => cur ?? presetTrack.id);
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  // Load track info + geojson whenever selected track changes
  useEffect(() => {
    if (!selectedTrackId) return;
    let cancelled = false;
    (async () => {
      const { data: presetTrack } = await (supabase as any)
        .from("preset_tracks")
        .select("id, name, latitude, longitude, track_geojson")
        .eq("id", selectedTrackId)
        .maybeSingle();
      if (cancelled || !presetTrack?.latitude || !presetTrack?.longitude) return;
      const info: TrackInfo = {
        id: presetTrack.id,
        name: presetTrack.name,
        latitude: Number(presetTrack.latitude),
        longitude: Number(presetTrack.longitude),
        geojson: presetTrack.track_geojson ?? null,
      };
      setTrack(info);
      setTrackCoords([]);
      setHasAutoFit(false);

      if (info.geojson?.coords?.length) {
        setTrackCoords(info.geojson.coords);
      } else {
        const query = `[out:json][timeout:15];way["highway"="raceway"](around:1500,${info.latitude},${info.longitude});out geom;`;
        try {
          const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
          });
          const json = await res.json();
          let best: [number, number][] = [];
          for (const el of json.elements ?? []) {
            if (el.type === "way" && Array.isArray(el.geometry)) {
              const coords: [number, number][] = el.geometry.map((g: any) => [g.lat, g.lon]);
              if (coords.length > best.length) best = coords;
            }
          }
          if (cancelled) return;
          if (best.length > 1) {
            setTrackCoords(best);
            (supabase as any).rpc("upsert_track_geojson", {
              _track_id: info.id,
              _geojson: { coords: best },
            }).then(() => {});
          }
        } catch {
          // silent
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTrackId]);

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
          setFixes((prev) => { const next = new Map(prev); next.set(key, row); return next; });
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => { cancelled = true; supabase.removeChannel(channel); };
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

  const liveCount = visibleFixes.filter((v) => v.ageMs <= STALE_MS).length;
  const totalCars = participants.length;
  const trackLengthMi = trackCoords.length > 1 ? polylineLengthMi(trackCoords) : null;

  // Map center: track coords bounds → track point → first fix → US fallback
  const points: [number, number][] = visibleFixes.map((v) => [v.fix.latitude, v.fix.longitude]);
  const mapCenter: [number, number] = track
    ? [track.latitude, track.longitude]
    : (points[0] ?? [39.8283, -98.5795]);
  const initialZoom = track ? 16 : (points.length ? 15 : 4);

  // Auto-fit to track when coords first arrive
  useEffect(() => {
    if (!hasAutoFit && trackCoords.length > 1) {
      setFitTrigger((n) => n + 1);
      setHasAutoFit(true);
    }
  }, [trackCoords, hasAutoFit]);

  const fitTarget = trackCoords.length > 1 ? trackCoords : points;

  // Leader = most recently updated fix
  const leaderPoint: [number, number] | null = useMemo(() => {
    if (!followLeader || visibleFixes.length === 0) return null;
    const sorted = [...visibleFixes].sort(
      (a, b) => new Date(b.fix.received_at).getTime() - new Date(a.fix.received_at).getTime(),
    );
    return [sorted[0].fix.latitude, sorted[0].fix.longitude];
  }, [followLeader, visibleFixes]);

  return (
    <Card className={cn("bg-card border-border/60 overflow-hidden", fullscreen && "h-full w-full border-0 rounded-none flex flex-col")}>
      <Collapsible open={fullscreen ? true : open} onOpenChange={fullscreen ? undefined : setOpen} className={cn(fullscreen && "flex-1 flex flex-col min-h-0")}>
        {!fullscreen && (
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <Radio size={16} className="text-primary shrink-0" />
              <span className="font-bold text-sm tracking-wider uppercase">Live Track Map</span>
              <div className="flex items-center gap-2 ml-2">
                <span className="live-pulse-dot" />
                <span className="text-[10px] font-bold tracking-widest text-primary">LIVE</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span><span className="text-foreground font-bold">{liveCount}</span>/{totalCars} cars</span>
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Race-control header strip */}
          <div className="px-4 py-2 bg-gradient-to-r from-background via-card to-background border-b border-border/60 flex items-center justify-between gap-3 text-[11px] flex-wrap">
            <div className="flex items-center gap-3 min-w-0 font-mono">
              <span className="font-bold text-foreground truncate uppercase tracking-wider">
                {track?.name ?? "Track location pending"}
              </span>
              {trackLengthMi != null && (
                <span className="text-muted-foreground shrink-0">
                  · <span className="text-foreground">{trackLengthMi.toFixed(2)}</span> mi
                </span>
              )}
              {selectedTrackId && eventTrackId && selectedTrackId !== eventTrackId && (
                <button
                  onClick={() => setSelectedTrackId(eventTrackId)}
                  className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline shrink-0"
                >
                  ↺ Reset to event track
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Popover open={trackPickerOpen} onOpenChange={setTrackPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={trackPickerOpen}
                    className="h-7 w-[220px] justify-between text-[10px] font-mono uppercase tracking-wider"
                  >
                    <span className="truncate">
                      {presets.find((p) => p.id === selectedTrackId)?.name ?? "Select track…"}
                    </span>
                    <ChevronsUpDown size={11} className="ml-1 opacity-60 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0 z-[1000]" align="end" sideOffset={4}>
                  <Command
                    filter={(value, search) => {
                      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
                      const v = norm(value);
                      const tokens = norm(search).split(" ").filter(Boolean);
                      if (tokens.length === 0) return 1;
                      return tokens.every((t) => v.includes(t)) ? 1 : 0;
                    }}
                  >
                    <CommandInput placeholder="Search tracks…" className="h-8 text-xs" />
                    <CommandList className="max-h-[260px]">
                      <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                        No tracks found.
                      </CommandEmpty>
                      <CommandGroup>
                        {presets.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => {
                              setSelectedTrackId(p.id);
                              setTrackPickerOpen(false);
                            }}
                            className="text-xs font-mono"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3.5 w-3.5",
                                selectedTrackId === p.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] font-mono uppercase tracking-wider"
                onClick={() => setFitTrigger((n) => n + 1)}
                disabled={fitTarget.length === 0}
              >
                <Crosshair size={11} className="mr-1" /> Fit
              </Button>
              <Button
                variant={followLeader ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] font-mono uppercase tracking-wider"
                onClick={() => setFollowLeader((v) => !v)}
                disabled={visibleFixes.length === 0}
              >
                <Target size={11} className="mr-1" /> Follow
              </Button>
            </div>
          </div>

          {/* Map */}
          <div className="live-track-map relative" style={{ height: 520 }}>
            <MapContainer
              center={mapCenter}
              zoom={initialZoom}
              scrollWheelZoom
              zoomControl={false}
              style={{ height: "100%", width: "100%" }}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Streets">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer
                    attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              {trackCoords.length > 1 && (
                <Marker position={trackCoords[0]} icon={startFinishIcon()}>
                  <Popup><div className="text-xs font-bold">Start / Finish</div></Popup>
                </Marker>
              )}
              <RecenterOnTrack
                trackId={track?.id ?? null}
                center={track ? [track.latitude, track.longitude] : null}
                framedRef={framedTrackRef}
              />
              <FitBounds trigger={fitTrigger} points={fitTarget} trackId={track?.id ?? null} framedRef={framedTrackRef} />
              <FollowLeader enabled={followLeader} point={leaderPoint} />
              <ZoomControls />
              {visibleFixes.map(({ fix, participant, ageMs }) => {
                const carNum = participant?.car_number ?? "?";
                const color = colorForRunGroup(participant?.run_group_id ?? null, runGroupIdx);
                const stale = ageMs > STALE_MS;
                const speedMph = fix.speed_mps != null ? Math.round(fix.speed_mps * 2.237) : null;
                const ageSec = Math.round(ageMs / 1000);
                return (
                  <Marker
                    key={fix.id}
                    position={[fix.latitude, fix.longitude]}
                    icon={carIcon(carNum, color, fix.heading_deg, stale)}
                  >
                    <Popup>
                      <div className="text-xs space-y-0.5 font-mono">
                        <div className="font-bold text-sm">#{carNum} {participant?.user_name ?? "Unknown driver"}</div>
                        {speedMph != null && <div>Speed: <span className="font-bold">{speedMph}</span> mph</div>}
                        {fix.heading_deg != null && <div>Hdg: {Math.round(fix.heading_deg)}°</div>}
                        <div className={stale ? "text-orange-500" : "text-muted-foreground"}>
                          Last fix: {ageSec}s ago{stale ? " (stale)" : ""}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Empty state overlay */}
            {visibleFixes.length === 0 && (
              <div className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-none">
                <div className="bg-card/85 backdrop-blur-md border border-border/60 rounded-lg px-5 py-3 flex items-center gap-3 shadow-2xl">
                  <Flag size={16} className="text-primary animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-wider text-foreground">
                    Awaiting first GPS fix from grid…
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default LiveTrackMap;
