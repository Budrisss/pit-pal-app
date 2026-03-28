import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Search, Calendar, DollarSign, Car, ExternalLink, Plus, ChevronRight, Filter, Building2, Pencil, Trash2, MoreVertical } from 'lucide-react';
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

import dashboardHero from '@/assets/dashboard-hero.jpg';
import tracksideLogo from '@/assets/trackside-logo-v2.png';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

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
}

interface OrganizerProfile {
  id: string;
  org_name: string;
}

const LocalEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

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

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'local' && userLocation) {
        const { data, error } = await supabase.rpc('events_within_radius', {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          radius_miles: 100,
        });
        if (error) throw error;
        setEvents((data as PublicEvent[]) || []);
      } else {
        const { data, error } = await supabase
          .from('public_events')
          .select('*')
          .eq('status', 'upcoming')
          .order('date', { ascending: true });
        if (error) throw error;
        setEvents(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, userLocation]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Geocode event ZIP when creating
  const geocodeZip = async (zip: string) => {
    const { data, error } = await supabase.functions.invoke('geocode-zip', {
      body: { zip_code: zip },
    });
    if (error || !data?.success) return null;
    return { latitude: data.latitude, longitude: data.longitude, city: data.city, state: data.state };
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerProfile || !user) return;

    setCreating(true);
    try {
      let lat = null, lng = null;
      if (newEvent.zip_code) {
        const geo = await geocodeZip(newEvent.zip_code);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
        }
      }

      const { error } = await supabase.from('public_events').insert({
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
      });

      if (error) throw error;

      toast({ title: "Event created!", description: "Your event is now visible to racers." });
      setShowCreateDialog(false);
      setNewEvent({ name: '', date: '', time: '', description: '', track_name: '', address: '', city: '', state: '', zip_code: '', entry_fee: '', car_classes: '', registration_link: '' });
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
      toast({ title: "Event updated!" });
      setShowEditDialog(false);
      setEditingEvent(null);
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
    organizerProfile && event.organizer_id === organizerProfile.id;

  const filteredEvents = events.filter(ev => {
    const matchesSearch = !searchQuery ||
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.track_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.state?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = stateFilter === 'all' || ev.state === stateFilter;
    return matchesSearch && matchesState;
  });

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
                      <h3 className="font-bold text-base leading-tight">{event.name}</h3>
                      <Badge variant="secondary" className="shrink-0 ml-2 text-xs">
                        {event.status}
                      </Badge>
                    </div>

                    {event.track_name && (
                      <p className="text-sm text-primary font-medium mb-1">{event.track_name}</p>
                    )}

                    <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
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

                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                    )}

                    <div className="mt-auto">
                      {event.registration_link && (
                        <Button size="sm" variant="outline" className="w-full" asChild>
                          <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                            Register <ExternalLink size={14} className="ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <Navigation />
    </div>
  );
};

export default LocalEvents;
