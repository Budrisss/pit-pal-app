import { useState, useEffect, useMemo } from "react";
import { Plus, Calendar, Timer, MapPin, Clock, Flag, ArrowLeft, LogOut, Gauge, CheckSquare } from "lucide-react";
import ProGate from "@/components/ProGate";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/EventCard";
import EventForm, { EventFormData } from "@/components/EventForm";
import Navigation from "@/components/Navigation";
import { useEvents, Event } from "@/contexts/EventsContext";
import { useChecklists } from "@/contexts/ChecklistsContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

import dashboardHero from "@/assets/dashboard-hero.jpg";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

const Events = () => {
  const { events, loading, addEvent, updateEvent } = useEvents();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [countdown, setCountdown] = useState("");
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Handle edit navigation from EventDetails
  useEffect(() => {
    if (location.state?.editingEvent) {
      setEditingEvent(location.state.editingEvent);
      setIsEventFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const nextUpcomingEvent = useMemo(() => {
    return events.find(e => e.status === "upcoming");
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeTab === "all") return events;
    return events.filter(e => e.status === activeTab);
  }, [events, activeTab]);

  const statusCounts = useMemo(() => ({
    all: events.length,
    upcoming: events.filter(e => e.status === "upcoming").length,
    completed: events.filter(e => e.status === "completed").length,
  }), [events]);

  const handleNewEvent = () => {
    setEditingEvent(null);
    setIsEventFormOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEventFormOpen(true);
  };

  const handleSaveEvent = async (eventData: EventFormData) => {
    if (editingEvent) {
      const updatedEvent: Event = {
        ...editingEvent,
        name: eventData.name,
        track: eventData.track,
        date: new Date(eventData.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(`2000-01-01T${eventData.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        eventDate: new Date(`${eventData.date}T${eventData.time}`),
        car: eventData.car,
        car_id: eventData.car_id,
        address: eventData.address,
        schedule: eventData.schedule?.filter(s => s.time && s.activity),
        requirements: eventData.requirements?.filter(r => r.trim()),
      };
      await updateEvent(updatedEvent);
    } else {
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
      const newEvent: Omit<Event, "id"> = {
        name: eventData.name,
        track: eventData.track,
        date: new Date(eventData.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(`2000-01-01T${eventData.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        status: "upcoming",
        eventDate: eventDateTime,
        car: eventData.car,
        car_id: eventData.car_id,
        address: eventData.address,
        description: `Track day event at ${eventData.track}. Get ready for an exciting day on the track!`,
        schedule: eventData.schedule?.filter(s => s.time && s.activity),
        requirements: eventData.requirements?.filter(r => r.trim()),
      };
      await addEvent(newEvent);
    }
    setEditingEvent(null);
  };

  const { fetchAllEventChecklists } = useChecklists();

  useEffect(() => {
    fetchAllEventChecklists();
  }, [events]);

  useEffect(() => {
    const updateCountdown = () => {
      if (nextUpcomingEvent) {
        const now = new Date().getTime();
        const eventTime = nextUpcomingEvent.eventDate.getTime();
        const timeDiff = eventTime - now;

        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown(`${days}d ${hours}h ${minutes}m`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextUpcomingEvent]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const stats = [
    { label: "Total", value: statusCounts.all, icon: Calendar },
    { label: "Upcoming", value: statusCounts.upcoming, icon: Flag },
    { label: "Completed", value: statusCounts.completed, icon: CheckSquare },
  ];

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border hidden lg:block"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-20">
          <Link to="/dashboard" className="flex items-center h-full py-1">
            <img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" />
          </Link>
          <div className="flex items-center gap-1">
            {[
              { label: "Home", path: "/dashboard" },
              { label: "Garage", path: "/garage" },
              { label: "Events", path: "/events" },
              { label: "Organizer", path: "/event-organizer" },
              { label: "Settings", path: "/settings" },
            ].map((item) => (
              <Button key={item.path} variant={location.pathname === item.path ? "default" : "ghost"} size="sm" asChild>
                <Link to={item.path}>{item.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut size={16} className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-0 lg:pt-20 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${dashboardHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20 lg:py-24">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6 lg:hidden"
          >
            <img src={tracksideLogo} alt="Track Side Ops" className="h-32 sm:h-36 w-auto invert" />
          </motion.div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter leading-none mb-3 text-center lg:text-left uppercase"
              >
                <span className="text-foreground">Track</span>
                <br />
                <span className="text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]">Events</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="text-base sm:text-lg text-muted-foreground max-w-xl text-center lg:text-left mx-auto lg:mx-0"
              >
                Manage your motorsport schedule
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex justify-center lg:justify-end"
            >
              <ProGate>
                <Button onClick={handleNewEvent} size="sm">
                  <Plus size={16} className="mr-1" /> New Event
                </Button>
              </ProGate>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3 sm:gap-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="group bg-card/60 backdrop-blur-md border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)]"
              >
                <stat.icon size={16} className="text-primary/60 mx-auto mb-2 group-hover:text-primary transition-colors" />
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-0.5">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        {/* Next Event Countdown Card */}
        {nextUpcomingEvent && countdown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card/70 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Next Event</p>
                  <h3 className="text-lg font-bold text-foreground">{nextUpcomingEvent.name}</h3>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {nextUpcomingEvent.track}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {nextUpcomingEvent.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                  <Timer size={18} className="text-primary" />
                  <span className="text-xl font-bold text-foreground tracking-wide">{countdown}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            {(["all", "upcoming", "completed"] as const).map((tab) => (
              <TabsTrigger key={tab} value={tab} className="flex items-center gap-1.5 capitalize">
                {tab}
                {statusCounts[tab] > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                    {statusCounts[tab]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Events Grid */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
                <Flag className="size-9 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {activeTab === "all" ? "No events yet" : `No ${activeTab} events`}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                {activeTab === "all"
                  ? "Create your first event to start tracking your motorsport schedule."
                  : `You don't have any ${activeTab} events at the moment.`}
              </p>
              {activeTab === "all" && (
                <Button onClick={handleNewEvent}>
                  <Plus size={16} />
                  Create Event
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  name={event.name}
                  track={event.track}
                  date={event.date}
                  time={event.time}
                  countdown={event.status === "upcoming" ? countdown : undefined}
                  status={event.status}
                  car={event.car}
                  address={event.address}
                  isRegistered={!!event.publicEventId}
                  publicEventId={event.publicEventId}
                  onEdit={() => handleEditEvent(event)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Event Form Dialog */}
        <EventForm
          open={isEventFormOpen}
          onOpenChange={setIsEventFormOpen}
          onSave={handleSaveEvent}
          editingEvent={editingEvent}
        />
      </section>
      <Navigation />
    </div>
  );
};

export default Events;
