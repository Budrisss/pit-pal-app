import { createContext, useContext, useState, ReactNode } from "react";

export interface Event {
  id: string;
  name: string;
  track: string;
  date: string;
  time: string;
  status: "upcoming" | "completed";
  eventDate: Date;
  car: string;
  address: string;
  description?: string;
  weather?: { temperature: string; condition: string; windSpeed: string };
  schedule?: { time: string; activity: string }[];
  requirements?: string[];
}

// Helper function to determine event status based on date
const getEventStatus = (eventDate: Date): "upcoming" | "completed" => {
  const now = new Date();
  return eventDate.getTime() > now.getTime() ? "upcoming" : "completed";
};

interface EventsContextType {
  events: Event[];
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (id: string) => void;
  getEventById: (id: string) => Event | undefined;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

const initialEvents: Event[] = [
  {
    id: "test-same-day-event",
    name: "Same Day Test Event",
    track: "Test Track", 
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: "2:00 PM",
    status: getEventStatus((() => {
      const today = new Date();
      today.setHours(14, 0, 0, 0);
      return today;
    })()),
    car: "Test Car - Same Day",
    address: "123 Test St, Test City, CA 90210",
    eventDate: (() => {
      const today = new Date();
      today.setHours(14, 0, 0, 0); // 2:00 PM
      return today;
    })(),
    description: "Test event for same-day functionality - should start with empty schedule",
    weather: { temperature: "72°F", condition: "Clear", windSpeed: "5 mph" },
    schedule: [], // Empty schedule for same-day event
    requirements: ["Valid driver's license", "Helmet", "Closed-toe shoes"]
  },
  {
    id: "test-event",
    name: "Test Track Day - Live Session",
    track: "Test Circuit", 
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: "7:00 PM",
    status: getEventStatus((() => {
      const today = new Date();
      today.setHours(19, 0, 0, 0);
      return today;
    })()),
    car: "Test Car - Session Ready",
    address: "34 teal dr. Langhorne, PA 19047",
    eventDate: (() => {
      const today = new Date();
      today.setHours(19, 0, 0, 0);
      return today;
    })(),
    description: "Join us for a live test session at our Test Circuit. Perfect for getting familiar with the track and testing your setup.",
    weather: { temperature: "68°F", condition: "Clear", windSpeed: "5 mph" },
    schedule: [
      { time: "6:00 PM", activity: "Registration & Setup" },
      { time: "7:00 PM", activity: "Live Session Begins" },
      { time: "9:00 PM", activity: "Session End" }
    ],
    requirements: ["Valid driver's license", "Helmet", "Closed-toe shoes"]
  },
  {
    id: "1",
    name: "Thunderhill Track Day",
    track: "Thunderhill Raceway",
    date: "Mar 15, 2024",
    time: "8:00 AM",
    status: getEventStatus(new Date("2024-03-15T08:00:00")),
    car: "Track Beast - 2018 Mazda MX-5",
    address: "5250 California 162, Willows, CA 95988",
    eventDate: new Date("2024-03-15T08:00:00"),
    description: "Join us for an exciting track day at the legendary Thunderhill Raceway. This 3-mile road course offers 15 challenging turns and elevation changes that will test your driving skills.",
    weather: { temperature: "72°F", condition: "Partly Cloudy", windSpeed: "8 mph" },
    schedule: [
      { time: "7:00 AM", activity: "Registration & Tech Inspection" },
      { time: "8:00 AM", activity: "Drivers Meeting" },
      { time: "8:30 AM", activity: "Practice Session 1" },
      { time: "10:00 AM", activity: "Practice Session 2" },
      { time: "12:00 PM", activity: "Lunch Break" },
      { time: "1:00 PM", activity: "Hot Laps Session" },
      { time: "3:00 PM", activity: "Final Session" },
      { time: "4:30 PM", activity: "Cool Down & Wrap Up" }
    ],
    requirements: ["Valid driver's license", "Helmet (Snell SA2015 or newer)", "Closed-toe shoes", "Long pants and shirt", "Vehicle tech inspection form"]
  },
  {
    id: "2", 
    name: "Laguna Seca Weekend",
    track: "WeatherTech Raceway",
    date: "Mar 8, 2024",
    time: "9:30 AM",
    status: "completed" as const,
    car: "Weekend Warrior - 2020 BMW M2",
    address: "1021 Monterey Salinas Hwy, Salinas, CA 93908",
    eventDate: new Date("2024-03-08T09:30:00"),
    description: "Experience the iconic corkscrew turn at WeatherTech Raceway Laguna Seca. This challenging 2.2-mile circuit is famous for its dramatic elevation changes.",
    weather: { temperature: "65°F", condition: "Foggy Morning", windSpeed: "12 mph" },
    schedule: [
      { time: "8:00 AM", activity: "Registration" },
      { time: "9:30 AM", activity: "Drivers Meeting" },
      { time: "10:00 AM", activity: "Practice Sessions" },
      { time: "2:00 PM", activity: "Timed Runs" },
      { time: "4:00 PM", activity: "Awards Ceremony" }
    ],
    requirements: ["Valid driver's license", "Helmet (Snell rated)", "Racing shoes", "Fire suit recommended"]
  },
  {
    id: "3",
    name: "Sonoma Speed Festival",
    track: "Sonoma Raceway",
    date: "Mar 22, 2024", 
    time: "7:45 AM",
    status: getEventStatus(new Date("2024-03-22T07:45:00")),
    car: "Track Beast - 2018 Mazda MX-5",
    address: "29355 Arnold Dr, Sonoma, CA 95476",
    eventDate: new Date("2024-03-22T07:45:00"),
    description: "Join the annual Sonoma Speed Festival at the historic Sonoma Raceway. This 2.52-mile road course features 12 turns and offers spectacular racing through the wine country.",
    weather: { temperature: "75°F", condition: "Sunny", windSpeed: "6 mph" },
    schedule: [
      { time: "6:30 AM", activity: "Gates Open & Registration" },
      { time: "7:45 AM", activity: "Mandatory Drivers Meeting" },
      { time: "8:30 AM", activity: "Practice Group A" },
      { time: "9:15 AM", activity: "Practice Group B" },
      { time: "11:00 AM", activity: "Qualifying Sessions" },
      { time: "1:00 PM", activity: "Lunch & Vendor Expo" },
      { time: "2:30 PM", activity: "Feature Races" },
      { time: "5:00 PM", activity: "Victory Celebration" }
    ],
    requirements: ["Valid driver's license", "Helmet (Snell SA2015 or newer)", "Racing suit or approved clothing", "HANS device recommended", "Vehicle tech inspection"]
  }
];

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Event[]>(initialEvents);

  const addEvent = (event: Event) => {
    setEvents(prev => [...prev, event]);
  };

  const updateEvent = (updatedEvent: Event) => {
    setEvents(prev => prev.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

  const getEventById = (id: string) => {
    return events.find(event => event.id === id);
  };

  return (
    <EventsContext.Provider value={{ events, addEvent, updateEvent, deleteEvent, getEventById }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};