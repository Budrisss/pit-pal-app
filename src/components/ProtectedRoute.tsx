import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { user, loading, onboardingCompleted } = useAuth();
  const isLiveMapPopout = window.location.pathname.startsWith("/live-map/") && !!window.opener;

  const needsOnboardingCheck = !!user && !skipOnboardingCheck;

  if (loading || (needsOnboardingCheck && onboardingCompleted === null)) {
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
    if (isLiveMapPopout) return <>{children}</>;
    return <Navigate to="/" replace />;
  }

  if (!skipOnboardingCheck && onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
