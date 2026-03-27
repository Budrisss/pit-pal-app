import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CarsProvider } from "@/contexts/CarsContext";
import { EventsProvider } from "@/contexts/EventsContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Garage from "./pages/Garage";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import EventOrganizer from "./pages/EventOrganizer";
import Setups from "./pages/Setups";
import Checklists from "./pages/Checklists";
import Settings from "./pages/Settings";
import SessionManagement from "./pages/SessionManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CarsProvider>
        <EventsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/garage" element={<Garage />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/event-organizer" element={<EventOrganizer />} />
            <Route path="/setups" element={<Setups />} />
            <Route path="/checklists" element={<Checklists />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/session-management/:eventId" element={<SessionManagement />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </EventsProvider>
      </CarsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
