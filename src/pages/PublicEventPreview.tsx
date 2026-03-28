import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, MapPin, DollarSign, Car, Clock, Tag, UserCheck, ExternalLink, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
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
  const [event, setEvent] = useState<PublicEventData | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [regTypes, setRegTypes] = useState<RegistrationType[]>([]);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [organizer, setOrganizer] = useState<OrganizerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: eventData }, { data: sessData }, { data: rtData }, { data: regsData }] = await Promise.all([
        supabase.from("public_events").select("*").eq("id", id).single(),
        supabase.from("public_event_sessions").select("*").eq("event_id", id).order("sort_order"),
        supabase.from("registration_types").select("*").eq("event_id", id),
        supabase.from("event_registrations").select("registration_type_id").eq("event_id", id),
      ]);

      if (eventData) {
        setEvent(eventData);
        // Fetch organizer name
        const { data: orgData } = await supabase
          .from("organizer_profiles")
          .select("org_name")
          .eq("id", eventData.organizer_id)
          .single();
        if (orgData) setOrganizer(orgData);
      }
      setSessions((sessData as EventSession[]) || []);
      setRegTypes((rtData as RegistrationType[]) || []);

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
        {/* Preview Banner */}
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
                return (
                  <Card key={rt.id} className="bg-card/60 border-border">
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
                        <Button size="sm" disabled={isFull} className="h-7 text-xs">
                          {isFull ? "Full" : (
                            <>
                              <UserCheck size={12} className="mr-1" /> Register
                            </>
                          )}
                        </Button>
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

      <Navigation />
    </div>
  );
};

export default PublicEventPreview;
