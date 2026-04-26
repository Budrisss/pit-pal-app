import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import OrganizerDesktopNavigation from "@/components/OrganizerDesktopNavigation";
import OrganizerMobileNavigation from "@/components/OrganizerMobileNavigation";

/**
 * Wraps every /organizer/* route. Provides the organizer brand chrome
 * (amber accent, distinct nav, accent strip) and gates access to approved
 * organizers only. Unapproved/not-an-organizer users get bounced.
 */
const OrganizerShell = () => {
  const { user, loading } = useAuth();
  const { isOrganizer, isApproved } = useOrganizerMode();

  // Set document title while inside the shell
  useEffect(() => {
    const previous = document.title;
    document.title = "Organizer · Track Side Ops";
    return () => { document.title = previous; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isOrganizer) return <Navigate to="/organizer/apply" replace />;
  if (!isApproved) return <Navigate to="/organizer/apply" replace />;

  return (
    <div
      className="min-h-screen pb-24 lg:pb-0"
      style={{ backgroundColor: "hsl(var(--org-bg))", color: "hsl(var(--foreground))" }}
    >
      {/* Accent strip — visible at all times so the mode is unmistakable */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] lg:hidden" style={{ background: "var(--gradient-org)" }} />
      <OrganizerDesktopNavigation />
      <main className="pt-1 lg:pt-0">
        <Outlet />
      </main>
      <OrganizerMobileNavigation />
    </div>
  );
};

export default OrganizerShell;