import { useState, useEffect } from "react";
import { Plus, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import EventForm, { EventFormData } from "@/components/EventForm";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { useEvents, Event } from "@/contexts/EventsContext";
import racingGrid from "@/assets/racing-grid.jpg";

const Events = () => {
  const { events, addEvent, updateEvent } = useEvents();
  const location = useLocation();
  const [countdown, setCountdown] = useState("");
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Handle edit navigation from EventDetails
  useEffect(() => {
    if (location.state?.editingEvent) {
      setEditingEvent(location.state.editingEvent);
      setIsEventFormOpen(true);
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
        address: eventData.address,
        description: `Track day event at ${eventData.track}. Get ready for an exciting day on the track!`,
      };
      await addEvent(newEvent);
    }
    setEditingEvent(null);
  };

  useEffect(() => {
    const updateCountdown = () => {
      const nextEvent = events.find(e => e.status === "upcoming");
      if (nextEvent) {
        const now = new Date().getTime();
        const eventTime = nextEvent.eventDate.getTime();
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
  }, [events]);

  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="text-primary" />
              Track Events
            </h1>
            <p className="text-muted-foreground text-sm">Manage your motorsport schedule</p>
          </div>
          <Button variant="pulse" size="sm" onClick={handleNewEvent}>
            <Plus size={16} />
            New Event
          </Button>
        </div>

        {/* Featured Racing Image */}
        <div className="relative overflow-hidden rounded-lg">
          <img 
            src={racingGrid} 
            alt="Racing Grid" 
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-foreground">Live the Racing Spirit</h3>
            <p className="text-racing-orange text-sm">Professional motorsport events and track days</p>
          </div>
        </div>

        {/* Next Event Countdown */}
        {countdown && (
          <div className="bg-gradient-pulse p-4 rounded-lg shadow-glow">
            <h3 className="text-white font-bold text-lg">Next Event</h3>
            <p className="text-white/80 text-sm">Thunderhill Track Day</p>
            <p className="text-2xl font-bold text-white mt-2">{countdown}</p>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {events.map((event) => (
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
                  onEdit={() => handleEditEvent(event)}
                />
              ))}
          </div>
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