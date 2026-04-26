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
  const { isOrganizer, isApproved, orgStatusLoading } = useOrganizerMode();

  // Set document title while inside the shell
  useEffect(() => {
    const previous = document.title;
    document.title = "Organizer · Track Side Ops";
    return () => { document.title = previous; };
  }, []);

  if (loading || orgStatusLoading) {
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
      style={{ background: "var(--gradient-org-bg)", color: "hsl(var(--foreground))" }}
    >
      {/* Accent strip — Williams stripe: thin white hairline above the blue bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] lg:hidden">
        <div className="h-px w-full bg-white/15" />
        <div className="h-1 w-full" style={{ background: "var(--gradient-org)" }} />
      </div>
      <OrganizerDesktopNavigation />
      <main className="pt-1 lg:pt-0">
        <Outlet />
      </main>
      <OrganizerMobileNavigation />
    </div>
  );
};

export default OrganizerShell;