import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user || skipOnboardingCheck) {
      setOnboardingChecked(true);
      return;
    }
    setOnboardingChecked(false);
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("racer_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setNeedsOnboarding(!data || data.onboarding_completed === false);
      setOnboardingChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user, skipOnboardingCheck, location.pathname]);

  if (loading || (user && !onboardingChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (needsOnboarding && !skipOnboardingCheck) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
