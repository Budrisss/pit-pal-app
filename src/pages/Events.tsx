import { useState, useEffect, useMemo } from "react";
import { Plus, Calendar, Timer, MapPin, Clock, Flag, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/EventCard";
import EventForm, { EventFormData } from "@/components/EventForm";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { useEvents, Event } from "@/contexts/EventsContext";
import { useChecklists } from "@/contexts/ChecklistsContext";

const Events = () => {
  const { events, loading, addEvent, updateEvent } = useEvents();
  const { generateChecklistsForEvent } = useChecklists();
  const location = useLocation();
  const navigate = useNavigate();
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
      };
      const newEventId = await addEvent(newEvent);
      if (newEventId) {
        await generateChecklistsForEvent(newEventId);
      }
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

  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-3">
            <Button variant="glass" size="icon" className="size-8" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="text-primary" />
                Track Events
              </h1>
              <p className="text-muted-foreground text-sm">Manage your motorsport schedule</p>
            </div>
          </div>
          <Button variant="pulse" size="sm" onClick={handleNewEvent}>
            <Plus size={16} />
            New Event
          </Button>
        </div>

        {/* Next Event Countdown Card */}
        {nextUpcomingEvent && countdown && (
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card/60 backdrop-blur-md p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-racing-orange/10" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <Button variant="pulse" onClick={handleNewEvent}>
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
      </div>
      <Navigation />
    </div>
  );
};

export default Events;
