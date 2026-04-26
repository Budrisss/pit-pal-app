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
import Download from "./pages/Download";
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
import LiveTrackMapFullscreen from "./pages/LiveTrackMapFullscreen";
import RacerLiveView from "./pages/RacerLiveView";
import DriverLiveView from "./pages/DriverLiveView";
import CrewLiveView from "./pages/CrewLiveView";
import MaintenanceLog from "./pages/MaintenanceLog";
import GridID from "./pages/GridID";
import GridManifest from "./pages/GridManifest";
import OrganizerStampPortal from "./pages/OrganizerStampPortal";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import AdminLoraSim from "./pages/AdminLoraSim";
import OnboardingProfile from "./pages/OnboardingProfile";
import OrganizerSettings from "./pages/OrganizerSettings";
import ModeChooser from "./pages/ModeChooser";
import OrganizerShell from "./layouts/OrganizerShell";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <OrganizerModeProvider>
          <SubscriptionProvider>
          <CarsProvider>
            <EventsProvider>
            <ChecklistsProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/download" element={<Download />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/choose-mode" element={<ProtectedRoute><ModeChooser /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><OnboardingProfile /></ProtectedRoute>} />
                <Route path="/garage" element={<ProtectedRoute><Garage /></ProtectedRoute>} />
                <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
                <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
                {/* Legacy organizer paths — redirect into the new shell */}
                <Route path="/event-organizer" element={<Navigate to="/organizer" replace />} />
                <Route path="/organizer-signup" element={<Navigate to="/organizer/apply" replace />} />
                <Route path="/organizer-stamp" element={<Navigate to="/organizer/stamps" replace />} />
                <Route path="/live-manage/:eventId" element={<LegacyLiveManageRedirect />} />
                <Route path="/setups" element={<ProtectedRoute><Setups /></ProtectedRoute>} />
                <Route path="/checklists" element={<ProtectedRoute><Checklists /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/session-management/:eventId" element={<ProtectedRoute><SessionManagement /></ProtectedRoute>} />
                <Route path="/local-events" element={<ProtectedRoute><LocalEvents /></ProtectedRoute>} />
                <Route path="/public-event/:id" element={<ProtectedRoute><PublicEventPreview /></ProtectedRoute>} />
                <Route path="/live-map/:eventId" element={<ProtectedRoute><LiveTrackMapFullscreen /></ProtectedRoute>} />
                <Route path="/race-live/:eventId" element={<ProtectedRoute><RacerLiveView /></ProtectedRoute>} />
                <Route path="/driver-live/:eventId" element={<ProtectedRoute><DriverLiveView /></ProtectedRoute>} />
                <Route path="/crew-live/:eventId" element={<ProtectedRoute><CrewLiveView /></ProtectedRoute>} />
                <Route path="/maintenance/:carId" element={<ProtectedRoute><MaintenanceLog /></ProtectedRoute>} />
                <Route path="/grid-id" element={<ProtectedRoute><GridID /></ProtectedRoute>} />
                <Route path="/grid-manifest/:userId" element={<ProtectedRoute><GridManifest /></ProtectedRoute>} />
                <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/admin/lora-sim" element={<ProtectedRoute><AdminLoraSim /></ProtectedRoute>} />

                {/* New organizer namespace — gated and chrome'd by OrganizerShell */}
                <Route path="/organizer/apply" element={<ProtectedRoute><OrganizerSignup /></ProtectedRoute>} />
                <Route element={<ProtectedRoute><OrganizerShell /></ProtectedRoute>}>
                  <Route path="/organizer" element={<EventOrganizer />} />
                  <Route path="/organizer/stamps" element={<OrganizerStampPortal />} />
                  <Route path="/organizer/settings" element={<OrganizerSettings />} />
                  <Route path="/organizer/live/:eventId" element={<OrganizerLiveManage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ChecklistsProvider>
            </EventsProvider>
          </CarsProvider>
          </SubscriptionProvider>
          </OrganizerModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Tiny inline component so /live-manage/:eventId keeps working from old bookmarks
import { useParams } from "react-router-dom";
function LegacyLiveManageRedirect() {
  const { eventId } = useParams();
  return <Navigate to={`/organizer/live/${eventId}`} replace />;
}

export default App;
