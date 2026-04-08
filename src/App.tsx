import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizerModeProvider } from "@/contexts/OrganizerModeContext";
import { CarsProvider } from "@/contexts/CarsContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { ChecklistsProvider } from "@/contexts/ChecklistsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Garage from "./pages/Garage";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import EventOrganizer from "./pages/EventOrganizer";
import Setups from "./pages/Setups";
import Checklists from "./pages/Checklists";
import Settings from "./pages/Settings";
import SessionManagement from "./pages/SessionManagement";
import LocalEvents from "./pages/LocalEvents";
import OrganizerSignup from "./pages/OrganizerSignup";
import PublicEventPreview from "./pages/PublicEventPreview";
import OrganizerLiveManage from "./pages/OrganizerLiveManage";
import RacerLiveView from "./pages/RacerLiveView";
import DriverLiveView from "./pages/DriverLiveView";
import CrewLiveView from "./pages/CrewLiveView";
import MaintenanceLog from "./pages/MaintenanceLog";
import GridID from "./pages/GridID";
import GridManifest from "./pages/GridManifest";
import OrganizerStampPortal from "./pages/OrganizerStampPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OrganizerModeProvider>
        <CarsProvider>
          <EventsProvider>
          <ChecklistsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/garage" element={<ProtectedRoute><Garage /></ProtectedRoute>} />
                <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
                <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
                <Route path="/event-organizer" element={<ProtectedRoute><EventOrganizer /></ProtectedRoute>} />
                <Route path="/setups" element={<ProtectedRoute><Setups /></ProtectedRoute>} />
                <Route path="/checklists" element={<ProtectedRoute><Checklists /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/session-management/:eventId" element={<ProtectedRoute><SessionManagement /></ProtectedRoute>} />
                <Route path="/local-events" element={<ProtectedRoute><LocalEvents /></ProtectedRoute>} />
                <Route path="/public-event/:id" element={<ProtectedRoute><PublicEventPreview /></ProtectedRoute>} />
                <Route path="/organizer-signup" element={<ProtectedRoute><OrganizerSignup /></ProtectedRoute>} />
                <Route path="/live-manage/:eventId" element={<ProtectedRoute><OrganizerLiveManage /></ProtectedRoute>} />
                <Route path="/race-live/:eventId" element={<ProtectedRoute><RacerLiveView /></ProtectedRoute>} />
                <Route path="/driver-live/:eventId" element={<ProtectedRoute><DriverLiveView /></ProtectedRoute>} />
                <Route path="/crew-live/:eventId" element={<ProtectedRoute><CrewLiveView /></ProtectedRoute>} />
                <Route path="/maintenance/:carId" element={<ProtectedRoute><MaintenanceLog /></ProtectedRoute>} />
                <Route path="/grid-id" element={<ProtectedRoute><GridID /></ProtectedRoute>} />
                <Route path="/grid-manifest/:userId" element={<ProtectedRoute><GridManifest /></ProtectedRoute>} />
                <Route path="/organizer-stamp" element={<ProtectedRoute><OrganizerStampPortal /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ChecklistsProvider>
          </EventsProvider>
        </CarsProvider>
        </OrganizerModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
