import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Search, Calendar, DollarSign, Car, ExternalLink, Plus, ChevronRight, Filter, Building2, Pencil, Trash2, MoreVertical, X, Users, Tag, UserCheck, ClipboardList, Phone, Mail } from 'lucide-react';
import { useOrganizerMode } from '@/contexts/OrganizerModeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import DesktopNavigation from '@/components/DesktopNavigation';
import { useCars } from '@/contexts/CarsContext';

import dashboardHero from '@/assets/dashboard-hero.jpg';
import tracksideLogo from '@/assets/trackside-logo-v2.png';

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
  registered_count?: number;
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
  latitude: number | null;
  longitude: number | null;
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

const LocalEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOrganizerMode } = useOrganizerMode();
  const { cars } = useCars();

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = useState<'local' | 'search'>('local');
  const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState({
    name: '', date: '', time: '', description: '', track_name: '',
    address: '', city: '', state: '', zip_code: '', entry_fee: '',
    car_classes: '', registration_link: '',
  });
  const [newRegTypes, setNewRegTypes] = useState<RegistrationType[]>([]);
  const [editRegTypes, setEditRegTypes] = useState<RegistrationType[]>([]);
  
  // Registration state
  const [registeringEvent, setRegisteringEvent] = useState<PublicEvent | null>(null);
  const [selectedRegTypeId, setSelectedRegTypeId] = useState<string>('');
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', notes: '', carNumber: '', carId: '' });
  const [registering, setRegistering] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [userRegisteredEventIds, setUserRegisteredEventIds] = useState<Set<string>>(new Set());
  const [unregisteringEventId, setUnregisteringEventId] = useState<string | null>(null);
  
  // Participant list state
  const [participantEvent, setParticipantEvent] = useState<PublicEvent | null>(null);
  const [participants, setParticipants] = useState<EventRegistration[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  // Check if user is an organizer
  useEffect(() => {
    if (!user) return;
    const fetchOrganizer = async () => {
      const { data } = await supabase
        .from('organizer_profiles')
        .select('id, org_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setOrganizerProfile(data);
    };
    fetchOrganizer();
  }, [user]);

  // Fetch user location
  useEffect(() => {
    if (!user) return;
    const fetchLocation = async () => {
      const { data } = await supabase
        .from('user_locations')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setUserLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
    };
    fetchLocation();
  }, [user]);

  // Fetch events with registration types
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let eventsData: PublicEvent[] = [];
      if (viewMode === 'local' && userLocation) {
        const { data, error } = await supabase.rpc('events_within_radius', {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          radius_miles: 100,
        });
        if (error) throw error;
        eventsData = (data as PublicEvent[]) || [];
      } else {
        const { data, error } = await supabase
          .from('public_events')
          .select('*')
          .eq('status', 'upcoming')
          .order('date', { ascending: true });
        if (error) throw error;
        eventsData = data || [];
      }

      // Fetch registration types for all events
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
      }

      setEvents(eventsData);
    } catch (err: any) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, userLocation]);

  // Fetch user's existing registrations (track regTypeId + carNumber combos)
  const fetchUserRegistrations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('event_registrations')
      .select('registration_type_id, car_number, event_id')
      .eq('user_id', user.id);
    if (data) {
      setUserRegistrations(new Set(data.map((r: any) => `${r.registration_type_id}_${r.car_number}`)));
      setUserRegisteredEventIds(new Set(data.map((r: any) => r.event_id)));
    }
  }, [user]);

  // Fetch registration counts per type
  const fetchRegistrationCounts = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) return;
    const { data } = await supabase
      .from('event_registrations')
      .select('registration_type_id')
      .in('event_id', eventIds);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((r: any) => {
        counts[r.registration_type_id] = (counts[r.registration_type_id] || 0) + 1;
      });
      setRegistrationCounts(counts);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchUserRegistrations();
  }, [fetchUserRegistrations]);

  useEffect(() => {
    if (events.length > 0) {
      fetchRegistrationCounts(events.map(e => e.id));
    }
  }, [events, fetchRegistrationCounts]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringEvent || !user) return;
    setRegistering(true);
    try {
      let regTypeId = selectedRegTypeId;

      // If no registration types exist, auto-create a "General Admission" group
      if (!regTypeId && (!registeringEvent.registration_types || registeringEvent.registration_types.length === 0)) {
        const { data: newType, error: typeError } = await supabase.from('registration_types').insert({
          event_id: registeringEvent.id,
          name: 'General Admission',
          description: 'General event registration',
          price: registeringEvent.entry_fee || null,
          max_spots: null,
        }).select('id').single();
        if (typeError) throw typeError;
        regTypeId = newType.id;
      }

      if (!regTypeId) throw new Error('Please select a registration group');

      if (!regForm.carNumber.trim()) throw new Error('Car number is required');
      const carNum = parseInt(regForm.carNumber);
      if (isNaN(carNum) || carNum <= 0) throw new Error('Car number must be a positive number');

      // Prevent duplicate registration for the same group + car number
      const comboKey = `${regTypeId}_${carNum}`;
      if (userRegistrations.has(comboKey)) {
        throw new Error('You are already registered for this group with this car number. Use a different car number to register again.');
      }

      const { error } = await (supabase as any).from('event_registrations').insert({
        event_id: registeringEvent.id,
        registration_type_id: regTypeId,
        user_id: user.id,
        user_name: regForm.name,
        user_email: regForm.email,
        user_phone: regForm.phone || null,
        notes: regForm.notes || null,
        car_number: carNum,
        car_id: regForm.carId || null,
      });
      if (error) {
        if (error.message?.includes('idx_unique_car_number_per_event')) {
          throw new Error(`Car #${carNum} is already taken for this event`);
        }
        throw error;
      }

      // Create a personal event in the user's events table
      const { data: newEvent, error: eventError } = await supabase.from('events').insert({
        user_id: user.id,
        name: registeringEvent.name,
        date: registeringEvent.date,
        time: registeringEvent.time || null,
        address: [registeringEvent.track_name, registeringEvent.address, registeringEvent.city, registeringEvent.state].filter(Boolean).join(', '),
        description: registeringEvent.description || null,
        status: 'upcoming',
        public_event_id: registeringEvent.id,
      }).select('id').single();

      if (eventError) throw eventError;

      // Copy organizer's sessions into the user's personal sessions
      if (newEvent) {
        const { data: orgSessions } = await supabase
          .from('public_event_sessions')
          .select('*')
          .eq('event_id', registeringEvent.id)
          .order('sort_order');

        if (orgSessions && orgSessions.length > 0) {
          const sessionInserts = orgSessions.map((s: any) => ({
            user_id: user.id,
            event_id: newEvent.id,
            name: s.name,
            type: 'practice',
            start_time: s.start_time || null,
            duration: s.duration_minutes || null,
            notes: null,
            state: 'upcoming',
          }));
          await supabase.from('sessions').insert(sessionInserts);
        }
      }

      toast({ title: "Registered!", description: "Event added to your schedule." });
      setRegisteringEvent(null);
      setSelectedRegTypeId('');
      setRegForm({ name: '', email: '', phone: '', notes: '', carNumber: '', carId: '' });

      // Navigate to the user's events page
      navigate('/events');
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async (regTypeId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('user_id', user.id)
        .eq('registration_type_id', regTypeId);
      if (error) throw error;
      toast({ title: "Registration cancelled" });
      fetchUserRegistrations();
      fetchRegistrationCounts(events.map(ev => ev.id));
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    }
  };

  const handleUnregisterFromEvent = async (eventId: string) => {
    if (!user) return;
    try {
      // Delete all registrations for this event
      const { error: regError } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      if (regError) throw regError;

      // Delete the personal event copy
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('public_event_id', eventId)
        .eq('user_id', user.id);
      if (eventError) throw eventError;

      toast({ title: "Unregistered", description: "Event removed from your schedule." });
      setUnregisteringEventId(null);
      fetchUserRegistrations();
      fetchRegistrationCounts(events.map(ev => ev.id));
    } catch (err: any) {
      toast({ title: "Failed to unregister", description: err.message, variant: "destructive" });
    }
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

  const geocodeZip = async (zip: string) => {
    const { data, error } = await supabase.functions.invoke('geocode-zip', {
      body: { zip_code: zip },
    });
    if (error || !data?.success) return null;
    return { latitude: data.latitude, longitude: data.longitude, city: data.city, state: data.state };
  };

  const saveRegistrationTypes = async (eventId: string, types: RegistrationType[], existingIds?: string[]) => {
    // Delete removed types
    if (existingIds && existingIds.length > 0) {
      const keepIds = types.filter(t => t.id).map(t => t.id!);
      const toDelete = existingIds.filter(id => !keepIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from('registration_types').delete().in('id', toDelete);
      }
    }

    // Upsert types
    for (const rt of types) {
      if (!rt.name.trim()) continue;
      if (rt.id) {
        await supabase.from('registration_types').update({
          name: rt.name,
          description: rt.description || null,
          price: rt.price || null,
          max_spots: rt.max_spots,
        }).eq('id', rt.id);
      } else {
        await supabase.from('registration_types').insert({
          event_id: eventId,
          name: rt.name,
          description: rt.description || null,
          price: rt.price || null,
          max_spots: rt.max_spots,
        });
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerProfile || !user) return;

    setCreating(true);
    try {
      let lat = null, lng = null;
      if (newEvent.zip_code) {
        const geo = await geocodeZip(newEvent.zip_code);
        if (geo) { lat = geo.latitude; lng = geo.longitude; }
      }

      const { data, error } = await supabase.from('public_events').insert({
        organizer_id: organizerProfile.id,
        name: newEvent.name,
        date: newEvent.date,
        time: newEvent.time || null,
        description: newEvent.description || null,
        track_name: newEvent.track_name || null,
        address: newEvent.address || null,
        city: newEvent.city || null,
        state: newEvent.state || null,
        zip_code: newEvent.zip_code || null,
        entry_fee: newEvent.entry_fee || null,
        car_classes: newEvent.car_classes || null,
        registration_link: newEvent.registration_link || null,
        latitude: lat,
        longitude: lng,
      }).select('id').single();

      if (error) throw error;

      // Save registration types
      if (data && newRegTypes.length > 0) {
        await saveRegistrationTypes(data.id, newRegTypes);
      }

      toast({ title: "Event created!", description: "Your event is now visible to racers." });
      setShowCreateDialog(false);
      setNewEvent({ name: '', date: '', time: '', description: '', track_name: '', address: '', city: '', state: '', zip_code: '', entry_fee: '', car_classes: '', registration_link: '' });
      setNewRegTypes([]);
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
      const ev = editingEvent;
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

      // Save registration types
      const existingIds = (editingEvent.registration_types || []).filter(t => t.id).map(t => t.id!);
      await saveRegistrationTypes(ev.id, editRegTypes, existingIds);

      toast({ title: "Event updated!" });
      setShowEditDialog(false);
      setEditingEvent(null);
      setEditRegTypes([]);
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

  const isOrganizerEvent = (event: PublicEvent) =>
    isOrganizerMode && organizerProfile && event.organizer_id === organizerProfile.id;

  const filteredEvents = events.filter(ev => {
    const matchesSearch = !searchQuery ||
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.track_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.state?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = stateFilter === 'all' || ev.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const openEditDialog = async (event: PublicEvent) => {
    setEditingEvent(event);
    // Load existing registration types
    const { data } = await supabase
      .from('registration_types')
      .select('*')
      .eq('event_id', event.id);
    setEditRegTypes((data || []).map((rt: any) => ({
      id: rt.id,
      name: rt.name,
      description: rt.description || '',
      price: rt.price || '',
      max_spots: rt.max_spots,
    })));
    setShowEditDialog(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      <DesktopNavigation />

      {/* Hero */}
      <section className="relative pt-0 lg:pt-20 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${dashboardHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-14 sm:py-18">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6 lg:hidden"
          >
            <img src={tracksideLogo} alt="Track Side Ops" className="h-12 w-auto invert" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-center lg:text-left"
          >
            Local <span className="text-primary">Events</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-muted-foreground max-w-xl mb-6 text-center lg:text-left mx-auto lg:mx-0"
          >
            {viewMode === 'local' && userLocation
              ? 'Showing events within 100 miles of your location.'
              : 'Browse and search all events across the US.'}
          </motion.p>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search events, tracks, cities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/60 backdrop-blur-md border-border"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full sm:w-32 bg-card/60 backdrop-blur-md border-border">
                <Filter size={16} className="mr-1" />
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'local' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('local')}
                disabled={!userLocation}
                className="flex-1 sm:flex-none"
              >
                <MapPin size={16} className="mr-1" /> Nearby
              </Button>
              <Button
                variant={viewMode === 'search' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('search')}
                className="flex-1 sm:flex-none"
              >
                <Search size={16} className="mr-1" /> All US
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* No location warning */}
        {viewMode === 'local' && !userLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6 text-center"
          >
            <p className="text-sm mb-2">Set your ZIP code to see events near you.</p>
            <Button size="sm" onClick={() => navigate('/settings')}>
              Go to Settings <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Organizer CTA */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
          </p>
          {organizerProfile ? (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus size={16} className="mr-1" /> Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Public Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Event Name *</Label>
                    <Input value={newEvent.name} onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} required placeholder="Spring Track Day" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Track Name</Label>
                    <Input value={newEvent.track_name} onChange={e => setNewEvent(p => ({ ...p, track_name: e.target.value }))} placeholder="Thunderhill Raceway" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={newEvent.address} onChange={e => setNewEvent(p => ({ ...p, address: e.target.value }))} placeholder="5250 Hwy 162" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={newEvent.city} onChange={e => setNewEvent(p => ({ ...p, city: e.target.value }))} placeholder="Willows" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={newEvent.state} onValueChange={v => setNewEvent(p => ({ ...p, state: v }))}>
                        <SelectTrigger><SelectValue placeholder="CA" /></SelectTrigger>
                        <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP</Label>
                      <Input value={newEvent.zip_code} onChange={e => setNewEvent(p => ({ ...p, zip_code: e.target.value }))} placeholder="95988" maxLength={5} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Entry Fee</Label>
                      <Input value={newEvent.entry_fee} onChange={e => setNewEvent(p => ({ ...p, entry_fee: e.target.value }))} placeholder="$150" />
                    </div>
                    <div className="space-y-2">
                      <Label>Car Classes</Label>
                      <Input value={newEvent.car_classes} onChange={e => setNewEvent(p => ({ ...p, car_classes: e.target.value }))} placeholder="Open, GT, Spec Miata" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Link</Label>
                    <Input type="url" value={newEvent.registration_link} onChange={e => setNewEvent(p => ({ ...p, registration_link: e.target.value }))} placeholder="https://motorsportreg.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder="Details about the event..." rows={3} />
                  </div>

                  {/* Registration Types */}
                  <RegistrationTypesEditor types={newRegTypes} onChange={setNewRegTypes} />

                  <Button type="submit" disabled={creating} className="w-full">
                    {creating ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Publish Event'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate('/organizer-signup')}>
              <Building2 size={16} className="mr-1" /> Become an Organizer
            </Button>
          )}
        </div>

        {/* Events Grid */}
        {!loading && filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {viewMode === 'local' ? 'Try expanding your search to All US.' : 'Try adjusting your search or filters.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-base leading-tight cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/public-event/${event.id}`)}>{event.name}</h3>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          {event.status}
                        </Badge>
                        {isOrganizerEvent(event) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openParticipantList(event)}>
                                <ClipboardList size={14} className="mr-2" /> Participants
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(event)}>
                                <Pencil size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeletingEventId(event.id)}>
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {event.track_name && (
                      <p className="text-sm text-primary font-medium mb-1">{event.track_name}</p>
                    )}

                    <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {event.time && <span>at {event.time}</span>}
                      </div>
                      {(event.city || event.state) && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span>{[event.city, event.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      {event.entry_fee && (
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} />
                          <span>{event.entry_fee}</span>
                        </div>
                      )}
                      {event.car_classes && (
                        <div className="flex items-center gap-2">
                          <Car size={14} />
                          <span>{event.car_classes}</span>
                        </div>
                      )}
                    </div>

                    {/* Registration Types Display */}
                    {event.registration_types && event.registration_types.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Tag size={12} /> Registration Groups
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {event.registration_types.map((rt, idx) => {
                            const count = rt.id ? (registrationCounts[rt.id] || 0) : 0;
                            const isFull = rt.max_spots ? count >= rt.max_spots : false;
                            const isRegistered = rt.id ? [...userRegistrations].some(k => k.startsWith(rt.id + '_')) : false;
                            return (
                              <Badge 
                                key={idx} 
                                variant={isRegistered ? "default" : isFull ? "secondary" : "outline"} 
                                className={`text-xs font-normal ${isRegistered ? '' : ''}`}
                              >
                                {rt.name}{rt.price ? ` · ${rt.price}` : ''}
                                {rt.max_spots ? ` · ${count}/${rt.max_spots}` : ''}
                                {isRegistered && <UserCheck size={10} className="ml-1" />}
                                {isFull && !isRegistered && ' · FULL'}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                    )}

                    <div className="mt-auto flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/public-event/${event.id}`)}
                      >
                        View
                      </Button>
                      {!isOrganizerEvent(event) && (
                        userRegisteredEventIds.has(event.id) ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="flex-1"
                              onClick={() => {
                                setRegisteringEvent(event);
                                setRegForm({ name: '', email: user?.email || '', phone: '', notes: '', carNumber: '', carId: '' });
                                if (event.registration_types?.length === 1 && event.registration_types[0].id) {
                                  setSelectedRegTypeId(event.registration_types[0].id);
                                }
                              }}
                            >
                              <Pencil size={14} className="mr-1" /> Edit Reg
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => setUnregisteringEventId(event.id)}
                            >
                              <X size={14} />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setRegisteringEvent(event);
                              setRegForm({ name: '', email: user?.email || '', phone: '', notes: '', carNumber: '', carId: '' });
                              if (event.registration_types?.length === 1 && event.registration_types[0].id) {
                                setSelectedRegTypeId(event.registration_types[0].id);
                              }
                            }}
                          >
                            <UserCheck size={14} className="mr-1" /> Register
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setEditingEvent(null); setEditRegTypes([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <form onSubmit={handleEditEvent} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Event Name *</Label>
                <Input value={editingEvent.name} onChange={e => setEditingEvent(p => p ? { ...p, name: e.target.value } : p)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={editingEvent.date} onChange={e => setEditingEvent(p => p ? { ...p, date: e.target.value } : p)} required />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={editingEvent.time || ''} onChange={e => setEditingEvent(p => p ? { ...p, time: e.target.value } : p)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Track Name</Label>
                <Input value={editingEvent.track_name || ''} onChange={e => setEditingEvent(p => p ? { ...p, track_name: e.target.value } : p)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editingEvent.address || ''} onChange={e => setEditingEvent(p => p ? { ...p, address: e.target.value } : p)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={editingEvent.city || ''} onChange={e => setEditingEvent(p => p ? { ...p, city: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={editingEvent.state || ''} onValueChange={v => setEditingEvent(p => p ? { ...p, state: v } : p)}>
                    <SelectTrigger><SelectValue placeholder="CA" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input value={editingEvent.zip_code || ''} onChange={e => setEditingEvent(p => p ? { ...p, zip_code: e.target.value } : p)} maxLength={5} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Entry Fee</Label>
                  <Input value={editingEvent.entry_fee || ''} onChange={e => setEditingEvent(p => p ? { ...p, entry_fee: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label>Car Classes</Label>
                  <Input value={editingEvent.car_classes || ''} onChange={e => setEditingEvent(p => p ? { ...p, car_classes: e.target.value } : p)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Registration Link</Label>
                <Input type="url" value={editingEvent.registration_link || ''} onChange={e => setEditingEvent(p => p ? { ...p, registration_link: e.target.value } : p)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editingEvent.description || ''} onChange={e => setEditingEvent(p => p ? { ...p, description: e.target.value } : p)} rows={3} />
              </div>

              {/* Registration Types */}
              <RegistrationTypesEditor types={editRegTypes} onChange={setEditRegTypes} />

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
            <AlertDialogDescription>This will permanently remove this event. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Registration Dialog */}
      <Dialog open={!!registeringEvent} onOpenChange={(open) => { if (!open) { setRegisteringEvent(null); setSelectedRegTypeId(''); } }}>
        <DialogContent className="max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register for {registeringEvent?.name}</DialogTitle>
          </DialogHeader>
          {registeringEvent && (
            <form onSubmit={handleRegister} className="space-y-4 mt-2">
              {/* Only show group selector if there are multiple registration types */}
              {registeringEvent.registration_types && registeringEvent.registration_types.length > 1 && (
                <div className="space-y-2">
                  <Label>Select Registration Group *</Label>
                  <Select value={selectedRegTypeId} onValueChange={setSelectedRegTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {registeringEvent.registration_types.map(rt => {
                        const count = rt.id ? (registrationCounts[rt.id] || 0) : 0;
                        const isFull = rt.max_spots ? count >= rt.max_spots : false;
                        const isRegistered = rt.id ? [...userRegistrations].some(k => k.startsWith(rt.id + '_')) : false;
                        return (
                          <SelectItem 
                            key={rt.id} 
                            value={rt.id || ''} 
                            disabled={isFull}
                          >
                            {rt.name}{rt.price ? ` — ${rt.price}` : ''}
                            {rt.max_spots ? ` (${count}/${rt.max_spots})` : ''}
                            {isRegistered ? ' ✓ Registered' : ''}
                            {isFull && !isRegistered ? ' — FULL' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedRegTypeId && [...userRegistrations].some(k => k.startsWith(selectedRegTypeId + '_')) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ℹ️ You have an existing registration for this group. You can register again with a different car number.
                    </p>
                  )}
                </div>
              )}

              {/* Show info for single reg type */}
              {registeringEvent.registration_types?.length === 1 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium">{registeringEvent.registration_types[0].name}</p>
                  {registeringEvent.registration_types[0].price && (
                    <p className="text-xs text-muted-foreground">{registeringEvent.registration_types[0].price}</p>
                  )}
                </div>
              )}

              {/* Show message for events with no reg types */}
              {(!registeringEvent.registration_types || registeringEvent.registration_types.length === 0) && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium">General Admission</p>
                  {registeringEvent.entry_fee && (
                    <p className="text-xs text-muted-foreground">{registeringEvent.entry_fee}</p>
                  )}
                </div>
              )}
              
              {/* Show selected group description */}
              {selectedRegTypeId && (() => {
                const sel = (registeringEvent.registration_types || []).find(r => r.id === selectedRegTypeId);
                return sel?.description ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{sel.description}</p>
                ) : null;
              })()}

              <div className="space-y-2">
                <Label>Your Name *</Label>
                <Input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Car Number *</Label>
                <Input type="number" min="1" value={regForm.carNumber} onChange={e => setRegForm(p => ({ ...p, carNumber: e.target.value }))} required placeholder="42" />
                <p className="text-[10px] text-muted-foreground">Must be unique for this event. Use a different number to register with another car.</p>
              </div>
              {cars.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Car from Garage</Label>
                  <Select value={regForm.carId} onValueChange={v => setRegForm(p => ({ ...p, carId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional — link a car from your garage" />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map(car => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.year} {car.make} {car.model} — {car.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} required placeholder="john@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} placeholder="555-123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={regForm.notes} onChange={e => setRegForm(p => ({ ...p, notes: e.target.value }))} placeholder="Experience level, car info, etc." rows={2} />
              </div>
              <Button 
                type="submit" 
                disabled={registering || (registeringEvent.registration_types && registeringEvent.registration_types.length > 1 && !selectedRegTypeId)} 
                className="w-full"
              >
                {registering ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : 'Confirm Registration'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
              {/* Group by registration type */}
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
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{p.user_name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1"><Mail size={10} /> {p.user_email}</span>
                              {p.user_phone && <span className="flex items-center gap-1"><Phone size={10} /> {p.user_phone}</span>}
                            </div>
                            {p.notes && <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>}
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

export default LocalEvents;
