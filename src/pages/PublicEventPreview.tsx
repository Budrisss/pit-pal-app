import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, MapPin, DollarSign, Car, Clock, Tag, UserCheck, ExternalLink, Users, Building2, Megaphone, Bell, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useCars } from "@/contexts/CarsContext";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";

interface RegistrationType {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  max_spots: number | null;
}

interface EventSession {
  id: string;
  registration_type_id: string | null;
  name: string;
  start_time: string | null;
  duration_minutes: number | null;
  sort_order: number;
}

interface Announcement {
  id: string;
  message: string;
  created_at: string;
}

interface PublicEventData {
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

interface OrganizerInfo {
  org_name: string;
}

const PublicEventPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOrganizerMode, organizerProfileId } = useOrganizerMode();
  const { toast } = useToast();
  const { cars } = useCars();

  const [event, setEvent] = useState<PublicEventData | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [regTypes, setRegTypes] = useState<RegistrationType[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [organizer, setOrganizer] = useState<OrganizerInfo | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncementFlash, setNewAnnouncementFlash] = useState(false);
  const [loading, setLoading] = useState(true);

  // Registration state
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [selectedRegTypeId, setSelectedRegTypeId] = useState<string>("");
  const [regForm, setRegForm] = useState({ name: "", email: "", phone: "", notes: "", carNumber: "", carId: "" });
  const [registering, setRegistering] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());

  const isOrganizerPreview = isOrganizerMode && event?.organizer_id === organizerProfileId;

  // Redirect non-organizer users away from this page
  useEffect(() => {
    if (!loading && event && !isOrganizerMode) {
      navigate("/local-events", { replace: true });
    }
  }, [loading, event, isOrganizerMode, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: eventData }, { data: sessData }, { data: rtData }, { data: regsData }, { data: annData }] = await Promise.all([
        supabase.from("public_events").select("*").eq("id", id).single(),
        supabase.from("public_event_sessions").select("*").eq("event_id", id).order("sort_order"),
        supabase.from("registration_types").select("*").eq("event_id", id),
        supabase.from("event_registrations").select("registration_type_id").eq("event_id", id),
        supabase.from("event_announcements").select("id, message, created_at").eq("event_id", id).order("created_at", { ascending: false }),
      ]);

      if (eventData) {
        setEvent(eventData);
        const { data: orgData } = await supabase
          .from("organizer_profiles")
          .select("org_name")
          .eq("id", eventData.organizer_id)
          .single();
        if (orgData) setOrganizer(orgData);
      }
      setSessions((sessData as EventSession[]) || []);
      setRegTypes((rtData as RegistrationType[]) || []);
      setAnnouncements((annData as Announcement[]) || []);

      if (regsData) {
        const counts: Record<string, number> = {};
        regsData.forEach((r: any) => {
          counts[r.registration_type_id] = (counts[r.registration_type_id] || 0) + 1;
        });
        setRegCounts(counts);
      }
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  // Fetch user's registrations for this event (track regTypeId + carNumber combos)
  useEffect(() => {
    if (!user || !id) return;
    const fetchUserRegs = async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("registration_type_id, car_number")
        .eq("event_id", id)
        .eq("user_id", user.id);
      if (data) {
        setUserRegistrations(new Set(data.map((r: any) => `${r.registration_type_id}_${r.car_number}`)));
      }
    };
    fetchUserRegs();
  }, [user, id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`event-live-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'public_event_sessions', filter: `event_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSessions(prev => prev.map(s => s.id === payload.new.id ? { ...payload.new as EventSession } : s));
          } else if (payload.eventType === 'INSERT') {
            setSessions(prev => [...prev, payload.new as EventSession].sort((a, b) => a.sort_order - b.sort_order));
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_announcements', filter: `event_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAnnouncements(prev => [payload.new as Announcement, ...prev]);
            setNewAnnouncementFlash(true);
            setTimeout(() => setNewAnnouncementFlash(false), 3000);
          } else if (payload.eventType === 'DELETE') {
            setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const openRegDialog = (preselectedRegTypeId?: string) => {
    setRegForm({ name: "", email: user?.email || "", phone: "", notes: "", carNumber: "", carId: "" });
    setSelectedRegTypeId(preselectedRegTypeId || (regTypes.length === 1 ? regTypes[0].id : ""));
    setShowRegDialog(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !user) return;
    setRegistering(true);
    try {
      let regTypeId = selectedRegTypeId;

      // If no registration types exist, auto-create a "General Admission" group
      if (!regTypeId && regTypes.length === 0) {
        const { data: newType, error: typeError } = await supabase.from("registration_types").insert({
          event_id: event.id,
          name: "General Admission",
          description: "General event registration",
          price: event.entry_fee || null,
          max_spots: null,
        }).select("id").single();
        if (typeError) throw typeError;
        regTypeId = newType.id;
      }

      if (!regTypeId) throw new Error("Please select a registration group");
      if (!regForm.carNumber.trim()) throw new Error("Car number is required");
      const carNum = parseInt(regForm.carNumber);
      if (isNaN(carNum) || carNum <= 0) throw new Error("Car number must be a positive number");

      const { error } = await (supabase as any).from("event_registrations").insert({
        event_id: event.id,
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
        if (error.message?.includes("idx_unique_car_number_per_event")) {
          throw new Error(`Car #${carNum} is already taken for this event`);
        }
        throw error;
      }
      if (error) throw error;

      // Create a personal event in the user's events table
      const { data: newEvent, error: eventError } = await supabase.from("events").insert({
        user_id: user.id,
        name: event.name,
        date: event.date,
        time: event.time || null,
        address: [event.track_name, event.address, event.city, event.state].filter(Boolean).join(", "),
        description: event.description || null,
        status: "upcoming",
        public_event_id: event.id,
      }).select("id").single();

      if (eventError) throw eventError;

      // Copy organizer's sessions into the user's personal sessions
      if (newEvent && sessions.length > 0) {
        const sessionInserts = sessions.map((s) => ({
          user_id: user.id,
          event_id: newEvent.id,
          name: s.name,
          type: "practice",
          start_time: s.start_time || null,
          duration: s.duration_minutes || null,
          notes: null,
          state: "upcoming",
        }));
        await supabase.from("sessions").insert(sessionInserts);
      }

      toast({ title: "Registered!", description: "Event added to your schedule." });
      setShowRegDialog(false);
      setUserRegistrations(prev => new Set([...prev, regTypeId]));
      setRegCounts(prev => ({ ...prev, [regTypeId]: (prev[regTypeId] || 0) + 1 }));

      // Navigate to the new personal event
      navigate(`/events/${newEvent.id}`);
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
        .from("event_registrations")
        .delete()
        .eq("user_id", user.id)
        .eq("registration_type_id", regTypeId);
      if (error) throw error;
      toast({ title: "Registration cancelled" });
      setUserRegistrations(prev => {
        const next = new Set(prev);
        next.delete(regTypeId);
        return next;
      });
      setRegCounts(prev => ({ ...prev, [regTypeId]: Math.max(0, (prev[regTypeId] || 0) - 1) }));
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
        <DesktopNavigation />
        <div className="pt-0 lg:pt-20 flex justify-center items-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Navigation />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
        <DesktopNavigation />
        <div className="pt-0 lg:pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Event not found</h2>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} className="mr-1" /> Go Back
            </Button>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  const getGroupName = (regTypeId: string | null) => {
    if (!regTypeId) return null;
    return regTypes.find((rt) => rt.id === regTypeId)?.name || null;
  };

  const totalRegistered = Object.values(regCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      <DesktopNavigation />

      <div className="pt-0 lg:pt-20 max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Preview Banner - only for organizers viewing their own event */}
        {isOrganizerPreview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default" className="text-xs">PREVIEW</Badge>
              <span className="text-muted-foreground">This is how participants will see your event</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/event-organizer")}>
              <ArrowLeft size={14} className="mr-1" /> Back to Organizer
            </Button>
          </motion.div>
        )}

        {/* Back button for non-organizer users */}
        {!isOrganizerPreview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} className="mr-1" /> Back
            </Button>
          </motion.div>
        )}

        {/* Live Announcements */}
        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Megaphone size={18} className="text-primary" /> Announcements
              {newAnnouncementFlash && (
                <Badge variant="destructive" className="animate-pulse text-[10px]">NEW</Badge>
              )}
            </h2>
            <div className="space-y-2">
              <AnimatePresence>
                {announcements.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Bell size={14} className="text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm">{a.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(a.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Event Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-card/80 backdrop-blur-md border-border mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">{event.name}</h1>
                  {organizer && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Building2 size={14} /> Hosted by {organizer.org_name}
                    </p>
                  )}
                </div>
                <Badge variant={event.status === "upcoming" ? "default" : "secondary"} className="text-sm shrink-0">
                  {event.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Calendar size={16} className="text-primary shrink-0" />
                  <span>
                    {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {event.time && ` at ${event.time}`}
                  </span>
                </div>
                {event.track_name && (
                  <div className="flex items-center gap-2.5 text-primary font-medium">
                    <MapPin size={16} className="shrink-0" />
                    <span>{event.track_name}</span>
                  </div>
                )}
                {(event.address || event.city || event.state) && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <MapPin size={16} className="shrink-0 opacity-50" />
                    <span>{[event.address, event.city, event.state, event.zip_code].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {event.entry_fee && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <DollarSign size={16} className="text-primary shrink-0" />
                    <span>{event.entry_fee}</span>
                  </div>
                )}
                {event.car_classes && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Car size={16} className="shrink-0" />
                    <span>{event.car_classes}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Users size={16} className="shrink-0" />
                  <span>{totalRegistered} registered</span>
                </div>
              </div>

              {event.description && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                </>
              )}

              {/* Main Register Button */}
              {!isOrganizerPreview && event.status === "upcoming" && (
                <div className="mt-5 space-y-2">
                  <Button className="w-full" size="lg" onClick={() => openRegDialog()}>
                    <UserCheck size={18} className="mr-2" /> Register for This Event
                  </Button>
                  {userRegistrations.size > 0 && (
                    <Button variant="outline" className="w-full" size="lg" onClick={() => navigate(`/race-live/${event.id}`)}>
                      <Radio size={18} className="mr-2" /> Open Race Live View
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Registration Groups */}
        {regTypes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Tag size={18} className="text-primary" /> Registration Groups
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {regTypes.map((rt) => {
                const count = regCounts[rt.id] || 0;
                const isFull = rt.max_spots ? count >= rt.max_spots : false;
                const isRegistered = [...userRegistrations].some(k => k.startsWith(rt.id + '_'));
                return (
                  <Card key={rt.id} className={`border-border ${isRegistered ? 'bg-primary/10 border-primary/30' : 'bg-card/60'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{rt.name}</h3>
                        {rt.price && (
                          <Badge variant="outline" className="text-xs">{rt.price}</Badge>
                        )}
                      </div>
                      {rt.description && (
                        <p className="text-xs text-muted-foreground mb-2">{rt.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {count}{rt.max_spots ? `/${rt.max_spots}` : ""} spots filled
                        </span>
                        {!isOrganizerPreview && (
                          isRegistered ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCancelRegistration(rt.id)}>
                              ✓ Registered — Cancel
                            </Button>
                          ) : (
                            <Button size="sm" disabled={isFull} className="h-7 text-xs" onClick={() => openRegDialog(rt.id)}>
                              {isFull ? "Full" : (
                                <>
                                  <UserCheck size={12} className="mr-1" /> Register
                                </>
                              )}
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Sessions / Schedule */}
        {sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Session Schedule
              <Badge variant="outline" className="text-[10px] font-normal">LIVE</Badge>
            </h2>
            <Card className="bg-card/60 border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {sessions.map((s, idx) => {
                    const groupName = getGroupName(s.registration_type_id);
                    return (
                      <div
                        key={s.id || idx}
                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col items-center shrink-0 w-12">
                            {s.start_time ? (
                              <span className="text-sm font-bold text-primary">{s.start_time}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">TBD</span>
                            )}
                            {s.duration_minutes && (
                              <span className="text-[10px] text-muted-foreground">{s.duration_minutes} min</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{s.name}</p>
                            {groupName && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">{groupName}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* External Registration Link */}
        {event.registration_link && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Button variant="outline" className="w-full" asChild>
              <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                External Registration <ExternalLink size={14} className="ml-2" />
              </a>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Registration Dialog */}
      <Dialog open={showRegDialog} onOpenChange={setShowRegDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register for {event.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4 mt-2">
            {/* Group selector for multiple types */}
            {regTypes.length > 1 && (
              <div className="space-y-2">
                <Label>Select Registration Group *</Label>
                <Select value={selectedRegTypeId} onValueChange={setSelectedRegTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {regTypes.map(rt => {
                      const count = regCounts[rt.id] || 0;
                      const isFull = rt.max_spots ? count >= rt.max_spots : false;
                      const isRegistered = userRegistrations.has(rt.id);
                      return (
                        <SelectItem
                          key={rt.id}
                          value={rt.id}
                          disabled={isFull || isRegistered}
                        >
                          {rt.name}{rt.price ? ` — ${rt.price}` : ""}
                          {rt.max_spots ? ` (${count}/${rt.max_spots})` : ""}
                          {isRegistered ? " ✓ Registered" : ""}
                          {isFull && !isRegistered ? " — FULL" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Single reg type info */}
            {regTypes.length === 1 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium">{regTypes[0].name}</p>
                {regTypes[0].price && (
                  <p className="text-xs text-muted-foreground">{regTypes[0].price}</p>
                )}
              </div>
            )}

            {/* No reg types */}
            {regTypes.length === 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium">General Admission</p>
                {event.entry_fee && (
                  <p className="text-xs text-muted-foreground">{event.entry_fee}</p>
                )}
              </div>
            )}

            {/* Selected group description */}
            {selectedRegTypeId && (() => {
              const sel = regTypes.find(r => r.id === selectedRegTypeId);
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
              <p className="text-[10px] text-muted-foreground">Must be unique for this event</p>
            </div>
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
              disabled={registering || (regTypes.length > 1 && !selectedRegTypeId)}
              className="w-full"
            >
              {registering ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Confirm Registration"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default PublicEventPreview;
