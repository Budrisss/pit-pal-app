import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users, Calendar, MapPin, Pencil, Trash2, Tag, X, ClipboardList, Mail, Phone, MoreVertical, Building2, Clock, Eye, Radio } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import AddressAutocomplete, { PlaceDetails } from "@/components/AddressAutocomplete";

interface PresetTrack {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  track_type: string | null;
}

const TRACK_TYPE_LABELS: Record<string, string> = {
  road: "Road Course",
  oval: "Oval",
  drag: "Drag Strip",
  dirt: "Dirt Track",
  kart: "Karting",
  street: "Street Circuit",
  rally: "Rally",
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

interface RegistrationType {
  id?: string;
  name: string;
  description: string;
  price: string;
  max_spots: number | null;
}

interface RunGroup {
  id?: string;
  name: string;
  sort_order: number;
}

interface EventSession {
  id?: string;
  run_group_id: string | null;
  registration_type_id: string | null;
  name: string;
  start_time: string;
  duration_minutes: number | null;
  sort_order: number;
}

interface EventRegistration {
  id: string;
  registration_type_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  notes: string | null;
  created_at: string;
  car_number: number | null;
}

interface PublicEvent {
  id: string;
  name: string;
  date: string;
  time: string | null;
  description: string | null;
  track_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  entry_fee: string | null;
  car_classes: string | null;
  registration_link: string | null;
  status: string;
  organizer_id: string;
  latitude?: number | null;
  longitude?: number | null;
  registration_types?: RegistrationType[];
}

interface OrganizerProfile {
  id: string;
  org_name: string;
}

const emptyRegType = (): RegistrationType => ({ name: '', description: '', price: '', max_spots: null });

const RegistrationTypesEditor = ({
  types,
  onChange,
}: {
  types: RegistrationType[];
  onChange: (types: RegistrationType[]) => void;
}) => {
  const addType = () => onChange([...types, emptyRegType()]);
  const removeType = (i: number) => onChange(types.filter((_, idx) => idx !== i));
  const updateType = (i: number, field: keyof RegistrationType, value: any) => {
    const updated = [...types];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Tag size={14} /> Registration Groups
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addType}>
          <Plus size={14} className="mr-1" /> Add Group
        </Button>
      </div>
      {types.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No registration groups yet. Add groups like "Instructor 1-Day", "Student 2-Day", etc.</p>
      )}
      {types.map((rt, i) => (
        <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => removeType(i)}
          >
            <X size={14} />
          </Button>
          <div className="grid grid-cols-2 gap-2 pr-6">
            <div className="space-y-1">
              <Label className="text-xs">Group Name *</Label>
              <Input
                value={rt.name}
                onChange={e => updateType(i, 'name', e.target.value)}
                placeholder="e.g. Instructor 1-Day"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price</Label>
              <Input
                value={rt.price}
                onChange={e => updateType(i, 'price', e.target.value)}
                placeholder="$150"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={rt.description}
                onChange={e => updateType(i, 'description', e.target.value)}
                placeholder="Full access, all sessions"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Spots</Label>
              <Input
                type="number"
                value={rt.max_spots ?? ''}
                onChange={e => updateType(i, 'max_spots', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const emptyRunGroup = (): RunGroup => ({ name: '', sort_order: 0 });

const RunGroupsEditor = ({
  groups,
  onChange,
}: {
  groups: RunGroup[];
  onChange: (groups: RunGroup[]) => void;
}) => {
  const addGroup = () => onChange([...groups, { ...emptyRunGroup(), sort_order: groups.length }]);
  const removeGroup = (i: number) => onChange(groups.filter((_, idx) => idx !== i));
  const updateGroup = (i: number, value: string) => {
    const updated = [...groups];
    updated[i] = { ...updated[i], name: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Users size={14} /> Run Groups
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          <Plus size={14} className="mr-1" /> Add Run Group
        </Button>
      </div>
      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No run groups yet. Add groups like "Beginner", "Intermediate", "Advanced" to assign to sessions.</p>
      )}
      {groups.map((rg, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={rg.name}
            onChange={e => updateGroup(i, e.target.value)}
            placeholder={`e.g. Group ${String.fromCharCode(65 + i)}`}
            className="h-8 text-sm flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => removeGroup(i)}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
    </div>
  );
};

const emptySession = (): EventSession => ({ run_group_id: null, registration_type_id: null, name: '', start_time: '', duration_minutes: null, sort_order: 0 });

const SessionsEditor = ({
  sessions,
  onChange,
  runGroups,
  defaultDuration = null,
}: {
  sessions: EventSession[];
  onChange: (sessions: EventSession[]) => void;
  runGroups: RunGroup[];
  defaultDuration?: number | null;
}) => {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const addSession = () => onChange([...sessions, { ...emptySession(), duration_minutes: defaultDuration, sort_order: sessions.length }]);
  const removeSession = (i: number) => onChange(sessions.filter((_, idx) => idx !== i));
  const updateSession = (i: number, field: keyof EventSession, value: any) => {
    const updated = [...sessions];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteIndex !== null ? sessions[deleteIndex]?.name || 'this session' : ''}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteIndex !== null) { removeSession(deleteIndex); setDeleteIndex(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Clock size={14} /> Sessions / Schedule
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addSession}>
          <Plus size={14} className="mr-1" /> Add Session
        </Button>
      </div>
      {sessions.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No sessions yet. Add sessions like "Group 1 - Morning", "Group 2 - Afternoon", etc.</p>
      )}
      {sessions.map((s, i) => (
        <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteIndex(i)}
          >
            <X size={14} />
          </Button>
          <div className="grid grid-cols-2 gap-2 pr-6">
            <div className="space-y-1">
              <Label className="text-xs">Session Name *</Label>
              <Input
                value={s.name}
                onChange={e => updateSession(i, 'name', e.target.value)}
                placeholder="e.g. Group 1 - Morning Run"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Run Group</Label>
              <Select
                value={s.run_group_id || 'none'}
                onValueChange={v => updateSession(i, 'run_group_id', v === 'none' ? null : v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All groups</SelectItem>
                  {runGroups.filter(rg => rg.name.trim()).map((rg, idx) => (
                    <SelectItem key={rg.id || `new-${idx}`} value={rg.id || `new-${idx}`}>
                      {rg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start Time</Label>
              <Input
                type="time"
                value={s.start_time || ''}
                onChange={e => updateSession(i, 'start_time', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (min)</Label>
              <Input
                type="number"
                value={s.duration_minutes ?? ''}
                onChange={e => updateSession(i, 'duration_minutes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="20"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
const EventFormFields = ({ values, onChange, isEdit = false, presetTracks = [], presetSearch, setPresetSearch, presetTypeFilter, setPresetTypeFilter }: {
  values: any;
  onChange: (field: string, value: string) => void;
  isEdit?: boolean;
  presetTracks?: PresetTrack[];
  presetSearch?: string;
  setPresetSearch?: (v: string) => void;
  presetTypeFilter?: string;
  setPresetTypeFilter?: (v: string) => void;
}) => {
  const search = presetSearch || "";
  const typeFilter = presetTypeFilter || "all";

  const allFilteredPresets = (search.length >= 2 || typeFilter !== "all")
    ? presetTracks.filter(t => {
        const matchesType = typeFilter === "all" || t.track_type === typeFilter;
        const matchesSearch = search.length < 2 ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.city && t.city.toLowerCase().includes(search.toLowerCase())) ||
          (t.state && t.state.toLowerCase().includes(search.toLowerCase()));
        return matchesType && matchesSearch;
      })
    : [];
  const filteredPresets = allFilteredPresets.slice(0, 50);

  return (
  <>
    <div className="space-y-2">
      <Label>Event Name *</Label>
      <Input value={values.name} onChange={e => onChange('name', e.target.value)} required placeholder="Spring Track Day" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Date *</Label>
        <Input type="date" value={values.date} onChange={e => onChange('date', e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Time</Label>
        <Input type="time" value={values.time || ''} onChange={e => onChange('time', e.target.value)} />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Track Name</Label>
      <Select onValueChange={(val) => {
        if (val === "manual") return;
        const preset = presetTracks.find(t => t.id === val);
        if (preset) {
          onChange('track_name', preset.name);
          if (preset.address) onChange('address', preset.address);
          if (preset.city) onChange('city', preset.city);
          if (preset.state) onChange('state', preset.state);
        }
      }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={values.track_name || "Select or type a track..."} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          <SelectItem value="manual">Enter manually</SelectItem>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Preset Tracks ({presetTracks.length} total)
            {(search.length >= 2 || typeFilter !== "all") && ` — ${allFilteredPresets.length} match${allFilteredPresets.length !== 1 ? 'es' : ''}`}
            {allFilteredPresets.length > 50 && ` (showing 50)`}
          </div>
          <div className="px-2 pb-1 space-y-1">
            <Input
              value={search}
              onChange={(e) => setPresetSearch?.(e.target.value)}
              placeholder={`Search ${presetTracks.length} tracks...`}
              className="h-8 text-xs"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <div className="flex flex-wrap gap-1">
              {[{ value: "all", label: "All" }, ...Object.entries(TRACK_TYPE_LABELS).map(([value, label]) => ({ value, label }))].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPresetTypeFilter?.(value); }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                    typeFilter === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filteredPresets.map((track) => (
            <SelectItem key={track.id} value={track.id}>
              <span>{track.name} - {track.city}, {track.state}</span>
              {track.track_type && (
                <span className="ml-1 text-[10px] text-muted-foreground">({TRACK_TYPE_LABELS[track.track_type] || track.track_type})</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={values.track_name || ''} onChange={e => onChange('track_name', e.target.value)} placeholder="Or type track name manually" />
    </div>
    <div className="space-y-2">
      <Label>Address</Label>
      <AddressAutocomplete
        value={values.address || ''}
        onChange={(val) => onChange('address', val)}
        onPlaceSelect={(details: PlaceDetails) => {
          onChange('address', details.formatted_address);
          if (details.city) onChange('city', details.city);
          if (details.state) onChange('state', details.state);
          if (details.zip_code) onChange('zip_code', details.zip_code);
          if (details.name && !values.track_name) onChange('track_name', details.name);
        }}
        placeholder="Search for an address..."
      />
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-2">
        <Label>City</Label>
        <Input value={values.city || ''} onChange={e => onChange('city', e.target.value)} placeholder="Willows" />
      </div>
      <div className="space-y-2">
        <Label>State</Label>
        <Select value={values.state || ''} onValueChange={v => onChange('state', v)}>
          <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>ZIP</Label>
        <Input value={values.zip_code || ''} onChange={e => onChange('zip_code', e.target.value)} placeholder="95988" maxLength={5} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Entry Fee</Label>
        <Input value={values.entry_fee || ''} onChange={e => onChange('entry_fee', e.target.value)} placeholder="$150" />
      </div>
      <div className="space-y-2">
        <Label>Car Classes</Label>
        <Input value={values.car_classes || ''} onChange={e => onChange('car_classes', e.target.value)} placeholder="Open, GT, Spec Miata" />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Registration Link (external)</Label>
      <Input type="url" value={values.registration_link || ''} onChange={e => onChange('registration_link', e.target.value)} placeholder="https://motorsportreg.com/..." />
    </div>
    <div className="space-y-2">
      <Label>Description</Label>
      <Textarea value={values.description || ''} onChange={e => onChange('description', e.target.value)} placeholder="Details about the event..." rows={3} />
    </div>
  </>
  );
};

const EventOrganizer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizerProfileId } = useOrganizerMode();
  const { toast } = useToast();

  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [newRegTypes, setNewRegTypes] = useState<RegistrationType[]>([]);
  const [editRegTypes, setEditRegTypes] = useState<RegistrationType[]>([]);
  const [newRunGroups, setNewRunGroups] = useState<RunGroup[]>([]);
  const [editRunGroups, setEditRunGroups] = useState<RunGroup[]>([]);
  const [originalEditRunGroupIds, setOriginalEditRunGroupIds] = useState<string[]>([]);
  const [newSessions, setNewSessions] = useState<EventSession[]>([]);
  const [editSessions, setEditSessions] = useState<EventSession[]>([]);
  const [originalEditSessionIds, setOriginalEditSessionIds] = useState<string[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [defaultSessionDuration, setDefaultSessionDuration] = useState<number>(20);
  const [defaultRegTypeNames, setDefaultRegTypeNames] = useState<string[]>([]);
  const [defaultSessionTemplates, setDefaultSessionTemplates] = useState<EventSession[]>([]);

  // Participant list state
  const [participantEvent, setParticipantEvent] = useState<PublicEvent | null>(null);
  const [participants, setParticipants] = useState<EventRegistration[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);


  const [presetTracks, setPresetTracks] = useState<PresetTrack[]>([]);
  const [presetSearch, setPresetSearch] = useState("");
  const [presetTypeFilter, setPresetTypeFilter] = useState("all");

  const [newEvent, setNewEvent] = useState({
    name: '', date: '', time: '', description: '', track_name: '',
    address: '', city: '', state: '', zip_code: '', entry_fee: '',
    car_classes: '', registration_link: '',
  });

  // Fetch organizer profile and settings
  useEffect(() => {
    if (!user) return;
    const fetchOrganizer = async () => {
      const { data } = await supabase
        .from('organizer_profiles')
        .select('id, org_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setOrganizerProfile(data);
        // Fetch saved defaults
        const { data: settings } = await supabase
          .from('organizer_settings' as any)
          .select('default_session_duration, default_reg_types, default_sessions')
          .eq('organizer_profile_id', data.id)
          .maybeSingle();
        if (settings) {
          const s = settings as any;
          setDefaultSessionDuration(s.default_session_duration || 20);
          if (s.default_reg_types) {
            const names = (s.default_reg_types as string).split('\n').filter((n: string) => n.trim());
            setDefaultRegTypeNames(names);
          }
          if (Array.isArray(s.default_sessions) && s.default_sessions.length > 0) {
            setDefaultSessionTemplates(s.default_sessions.map((ds: any, i: number) => ({
              name: ds.name || '',
              start_time: ds.start_time || '',
              duration_minutes: ds.duration_minutes ?? (s.default_session_duration || 20),
              registration_type_id: null,
              sort_order: i,
            })));
          }
        }
      } else {
        setLoading(false);
      }
    };
    fetchOrganizer();
  }, [user]);

  useEffect(() => {
    supabase.from('preset_tracks').select('id, name, address, city, state, track_type').order('name')
      .then(({ data }) => { if (data) setPresetTracks(data as PresetTrack[]); });
  }, []);

  // Fetch organizer's events
  const fetchEvents = useCallback(async () => {
    if (!organizerProfile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_events')
        .select('*')
        .eq('organizer_id', organizerProfile.id)
        .order('date', { ascending: true });
      if (error) throw error;

      let eventsData = data || [];

      // Fetch registration types
      if (eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: regTypes } = await supabase
          .from('registration_types')
          .select('*')
          .in('event_id', eventIds);

        if (regTypes) {
          const byEvent: Record<string, RegistrationType[]> = {};
          regTypes.forEach((rt: any) => {
            if (!byEvent[rt.event_id]) byEvent[rt.event_id] = [];
            byEvent[rt.event_id].push(rt);
          });
          eventsData = eventsData.map(e => ({ ...e, registration_types: byEvent[e.id] || [] }));
        }

        // Fetch registration counts
        const { data: regs } = await supabase
          .from('event_registrations')
          .select('registration_type_id')
          .in('event_id', eventIds);
        if (regs) {
          const counts: Record<string, number> = {};
          regs.forEach((r: any) => {
            counts[r.registration_type_id] = (counts[r.registration_type_id] || 0) + 1;
          });
          setRegistrationCounts(counts);
          setTotalRegistrations(regs.length);
        }
      }

      setEvents(eventsData);
    } catch (err: any) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [organizerProfile]);

  useEffect(() => {
    if (organizerProfile) fetchEvents();
  }, [organizerProfile, fetchEvents]);

  const geocodeZip = async (zip: string) => {
    const { data, error } = await supabase.functions.invoke('geocode-zip', {
      body: { zip_code: zip },
    });
    if (error || !data?.success) return null;
    return { latitude: data.latitude, longitude: data.longitude, city: data.city, state: data.state };
  };

  const saveRegistrationTypes = async (eventId: string, types: RegistrationType[], existingIds?: string[]) => {
    if (existingIds && existingIds.length > 0) {
      const keepIds = types.filter(t => t.id).map(t => t.id!);
      const toDelete = existingIds.filter(id => !keepIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('registration_types').delete().in('id', toDelete);
      }
    }
    for (const rt of types) {
      if (!rt.name.trim()) continue;
      if (rt.id) {
        await supabase.from('registration_types').update({
          name: rt.name, description: rt.description || null,
          price: rt.price || null, max_spots: rt.max_spots,
        }).eq('id', rt.id);
      } else {
        await supabase.from('registration_types').insert({
          event_id: eventId, name: rt.name,
          description: rt.description || null, price: rt.price || null, max_spots: rt.max_spots,
        });
      }
    }
  };

  const saveSessions = async (eventId: string, sessions: EventSession[], existingIds?: string[]) => {
    if (existingIds && existingIds.length > 0) {
      const keepIds = sessions.filter(s => s.id).map(s => s.id!);
      const toDelete = existingIds.filter(id => !keepIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('public_event_sessions').delete().in('id', toDelete);
      }
    }
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.name.trim()) continue;
      const payload = {
        name: s.name,
        registration_type_id: s.registration_type_id || null,
        start_time: s.start_time || null,
        duration_minutes: s.duration_minutes,
        sort_order: i,
      };
      if (s.id) {
        await supabase.from('public_event_sessions').update(payload).eq('id', s.id);
      } else {
        await supabase.from('public_event_sessions').insert({ ...payload, event_id: eventId });
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerProfile) return;
    setCreating(true);
    try {
      let lat = null, lng = null;
      if (newEvent.zip_code) {
        const geo = await geocodeZip(newEvent.zip_code);
        if (geo) { lat = geo.latitude; lng = geo.longitude; }
      }
      const { data, error } = await supabase.from('public_events').insert({
        organizer_id: organizerProfile.id,
        name: newEvent.name, date: newEvent.date,
        time: newEvent.time || null, description: newEvent.description || null,
        track_name: newEvent.track_name || null, address: newEvent.address || null,
        city: newEvent.city || null, state: newEvent.state || null,
        zip_code: newEvent.zip_code || null, entry_fee: newEvent.entry_fee || null,
        car_classes: newEvent.car_classes || null, registration_link: newEvent.registration_link || null,
        latitude: lat, longitude: lng,
      }).select('id').single();
      if (error) throw error;
      if (data && newRegTypes.length > 0) {
        await saveRegistrationTypes(data.id, newRegTypes);
      }
      if (data && newSessions.length > 0) {
        await saveSessions(data.id, newSessions);
      }
      toast({ title: "Event created!", description: "Your event is now live." });
      setShowCreateDialog(false);
      setNewEvent({ name: '', date: '', time: '', description: '', track_name: '', address: '', city: '', state: '', zip_code: '', entry_fee: '', car_classes: '', registration_link: '' });
      setNewRegTypes([]);
      setNewSessions([]);
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Failed to create event", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !organizerProfile) return;
    setCreating(true);
    try {
      let lat = editingEvent.latitude ?? null;
      let lng = editingEvent.longitude ?? null;
      const ev = editingEvent as any;
      if (ev.zip_code) {
        const geo = await geocodeZip(ev.zip_code);
        if (geo) { lat = geo.latitude; lng = geo.longitude; }
      }
      const { error } = await supabase.from('public_events').update({
        name: ev.name, date: ev.date, time: ev.time || null,
        description: ev.description || null, track_name: ev.track_name || null,
        address: ev.address || null, city: ev.city || null, state: ev.state || null,
        zip_code: ev.zip_code || null, entry_fee: ev.entry_fee || null,
        car_classes: ev.car_classes || null, registration_link: ev.registration_link || null,
        latitude: lat, longitude: lng,
      }).eq('id', ev.id);
      if (error) throw error;
      const existingIds = (editingEvent.registration_types || []).filter(t => t.id).map(t => t.id!);
      await saveRegistrationTypes(ev.id, editRegTypes, existingIds);
      await saveSessions(ev.id, editSessions, originalEditSessionIds);
      toast({ title: "Event updated!" });
      setShowEditDialog(false);
      setEditingEvent(null);
      setEditRegTypes([]);
      setEditSessions([]);
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;
    try {
      const { error } = await supabase.from('public_events').delete().eq('id', deletingEventId);
      if (error) throw error;
      toast({ title: "Event deleted" });
      setDeletingEventId(null);
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const openEditDialog = async (event: PublicEvent) => {
    setEditingEvent(event);
    const [{ data: regData }, { data: sessData }] = await Promise.all([
      supabase.from('registration_types').select('*').eq('event_id', event.id),
      supabase.from('public_event_sessions').select('*').eq('event_id', event.id).order('sort_order'),
    ]);
    setEditRegTypes((regData || []).map((rt: any) => ({
      id: rt.id, name: rt.name, description: rt.description || '',
      price: rt.price || '', max_spots: rt.max_spots,
    })));
    const mappedSessions = (sessData || []).map((s: any) => ({
      id: s.id, registration_type_id: s.registration_type_id,
      run_group_id: s.run_group_id || null,
      name: s.name, start_time: s.start_time || '',
      duration_minutes: s.duration_minutes, sort_order: s.sort_order,
    }));
    setEditSessions(mappedSessions);
    setOriginalEditSessionIds(mappedSessions.filter((s: EventSession) => s.id).map((s: EventSession) => s.id!));
    setShowEditDialog(true);
  };

  const openPreview = (event: PublicEvent) => {
    navigate(`/public-event/${event.id}`);
  };

  const openParticipantList = async (event: PublicEvent) => {
    setParticipantEvent(event);
    setLoadingParticipants(true);
    const { data } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true });
    setParticipants((data as EventRegistration[]) || []);
    setLoadingParticipants(false);
  };

  const getEventRegCount = (event: PublicEvent) => {
    return (event.registration_types || []).reduce((sum, rt) => {
      return sum + (rt.id ? (registrationCounts[rt.id] || 0) : 0);
    }, 0);
  };

  if (!loading && !organizerProfile) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
        <DesktopNavigation />
        <div className="pt-0 lg:pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-6">
            <Building2 size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Become an Event Organizer</h2>
            <p className="text-muted-foreground mb-6">
              Register as an organizer to create and manage racing events with registration groups and participant tracking.
            </p>
            <Button onClick={() => navigate('/organizer-signup')}>
              <Building2 size={16} className="mr-2" /> Sign Up as Organizer
            </Button>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  // EventFormFields moved outside the component — see top-level definition below

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      <DesktopNavigation />

      <div className="pt-0 lg:pt-20 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Event <span className="text-primary">Organizer</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {organizerProfile?.org_name} — Manage your events and registrations
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
              if (open) {
                // Pre-populate with saved defaults
                if (defaultRegTypeNames.length > 0) {
                  setNewRegTypes(defaultRegTypeNames.map(name => ({ name, description: '', price: '', max_spots: null })));
                }
                if (defaultSessionTemplates.length > 0) {
                  setNewSessions([...defaultSessionTemplates]);
                }
              }
              setShowCreateDialog(open);
            }}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-1" /> Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Public Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
                <EventFormFields
                  values={newEvent}
                  onChange={(field, value) => setNewEvent(p => ({ ...p, [field]: value }))}
                  presetTracks={presetTracks}
                  presetSearch={presetSearch}
                  setPresetSearch={setPresetSearch}
                  presetTypeFilter={presetTypeFilter}
                  setPresetTypeFilter={setPresetTypeFilter}
                />
                <RegistrationTypesEditor types={newRegTypes} onChange={setNewRegTypes} />
                <RunGroupsEditor groups={newRunGroups} onChange={setNewRunGroups} />
                <SessionsEditor sessions={newSessions} onChange={setNewSessions} runGroups={newRunGroups} defaultDuration={defaultSessionDuration} />
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Publish Event'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <Card className="bg-card/80 border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRegistrations}</p>
                <p className="text-sm text-muted-foreground">Total Registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Tag size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {events.reduce((sum, e) => sum + (e.registration_types?.length || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Registration Groups</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first event to get started.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card className="bg-card/80 border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg truncate">{event.name}</h3>
                          <Badge variant={event.status === 'upcoming' ? 'default' : 'secondary'} className="text-xs shrink-0">
                            {event.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                          {event.track_name && (
                            <span className="text-primary font-medium">{event.track_name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {event.time && ` at ${event.time}`}
                          </span>
                          {(event.city || event.state) && (
                            <span className="flex items-center gap-1">
                              <MapPin size={13} />
                              {[event.city, event.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users size={13} />
                            {getEventRegCount(event)} registered
                          </span>
                        </div>

                        {/* Registration groups */}
                        {event.registration_types && event.registration_types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {event.registration_types.map((rt, idx) => {
                              const count = rt.id ? (registrationCounts[rt.id] || 0) : 0;
                              return (
                                <Badge key={idx} variant="outline" className="text-xs font-normal">
                                  {rt.name}{rt.price ? ` · ${rt.price}` : ''}
                                  {rt.max_spots ? ` · ${count}/${rt.max_spots}` : ` · ${count}`}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/live-manage/${event.id}`)}>
                            <Radio size={14} className="mr-2" /> Live Manage
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPreview(event)}>
                            <Eye size={14} className="mr-2" /> Preview Event
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openParticipantList(event)}>
                            <ClipboardList size={14} className="mr-2" /> View Participants
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(event)}>
                            <Pencil size={14} className="mr-2" /> Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingEventId(event.id)}>
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setEditingEvent(null); setEditRegTypes([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <form onSubmit={handleEditEvent} className="space-y-4 mt-4">
              <EventFormFields
                values={editingEvent}
                onChange={(field, value) => setEditingEvent(p => p ? { ...p, [field]: value } : p)}
                isEdit
                presetTracks={presetTracks}
                presetSearch={presetSearch}
                setPresetSearch={setPresetSearch}
                presetTypeFilter={presetTypeFilter}
                setPresetTypeFilter={setPresetTypeFilter}
              />
              <RegistrationTypesEditor types={editRegTypes} onChange={setEditRegTypes} />
              <SessionsEditor sessions={editSessions} onChange={setEditSessions} registrationTypes={editRegTypes} />
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEventId} onOpenChange={(open) => { if (!open) setDeletingEventId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this event and all registrations. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Participant List Dialog */}
      <Dialog open={!!participantEvent} onOpenChange={(open) => { if (!open) setParticipantEvent(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={20} /> Participants — {participantEvent?.name}
            </DialogTitle>
          </DialogHeader>
          {loadingParticipants ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>No registrations yet.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {(participantEvent?.registration_types || []).map(rt => {
                const groupParticipants = participants.filter(p => p.registration_type_id === rt.id);
                if (groupParticipants.length === 0) return null;
                return (
                  <div key={rt.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Tag size={14} className="text-primary" /> {rt.name}
                        {rt.price && <span className="text-muted-foreground font-normal">({rt.price})</span>}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {groupParticipants.length}{rt.max_spots ? `/${rt.max_spots}` : ''} registered
                      </Badge>
                    </div>
                    <div className="border border-border rounded-lg divide-y divide-border">
                      {groupParticipants.map(p => (
                        <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {p.car_number != null && (
                              <Badge variant="outline" className="font-mono font-bold text-sm shrink-0">
                                #{p.car_number}
                              </Badge>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{p.user_name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1"><Mail size={10} /> {p.user_email}</span>
                              {p.user_phone && <span className="flex items-center gap-1"><Phone size={10} /> {p.user_phone}</span>}
                            </div>
                              {p.notes && <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Total: {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Navigation />

    </div>
  );
};

export default EventOrganizer;
