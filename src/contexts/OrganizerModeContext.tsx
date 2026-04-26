import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OrganizerModeContextType {
  isOrganizer: boolean;
  isApproved: boolean;
  isOrganizerMode: boolean;
  enterOrganizerMode: () => Promise<void>;
  exitOrganizerMode: () => Promise<void>;
  organizerProfileId: string | null;
  lastActiveMode: "racer" | "organizer" | null;
}

const OrganizerModeContext = createContext<OrganizerModeContextType | undefined>(undefined);

export const useOrganizerMode = () => {
  const context = useContext(OrganizerModeContext);
  if (!context) throw new Error("useOrganizerMode must be used within OrganizerModeProvider");
  return context;
};

export const OrganizerModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [organizerProfileId, setOrganizerProfileId] = useState<string | null>(null);
  const [lastActiveMode, setLastActiveMode] = useState<"racer" | "organizer" | null>(null);

  // Mode is now derived from the URL — the source of truth is "are we inside /organizer/*?"
  const isOrganizerMode = location.pathname.startsWith("/organizer") && location.pathname !== "/organizer/apply";

  useEffect(() => {
    if (!user) {
      setIsOrganizer(false);
      setIsApproved(false);
      setOrganizerProfileId(null);
      setLastActiveMode(null);
      return;
    }
    supabase
      .from("organizer_profiles")
      .select("id, approved")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsOrganizer(!!data);
        setIsApproved(!!data?.approved);
        setOrganizerProfileId(data?.id || null);
      });
    supabase
      .from("racer_profiles")
      .select("last_active_mode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const m = (data as any)?.last_active_mode;
        if (m === "racer" || m === "organizer") setLastActiveMode(m);
        else setLastActiveMode("racer");
      });
    // Clean up legacy toggle key
    localStorage.removeItem("organizerMode");
  }, [user]);

  const persistMode = async (mode: "racer" | "organizer") => {
    setLastActiveMode(mode);
    if (!user) return;
    await supabase
      .from("racer_profiles")
      .update({ last_active_mode: mode } as any)
      .eq("user_id", user.id);
  };

  const enterOrganizerMode = async () => {
    await persistMode("organizer");
    navigate("/organizer");
  };

  const exitOrganizerMode = async () => {
    await persistMode("racer");
    navigate("/dashboard");
  };

  // Auto-persist mode whenever the user crosses the boundary
  useEffect(() => {
    if (!user) return;
    if (isOrganizerMode && lastActiveMode !== "organizer") persistMode("organizer");
    if (!isOrganizerMode && location.pathname.startsWith("/dashboard") && lastActiveMode !== "racer") persistMode("racer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user]);

  return (
    <OrganizerModeContext.Provider
      value={{
        isOrganizer,
        isApproved,
        isOrganizerMode,
        enterOrganizerMode,
        exitOrganizerMode,
        organizerProfileId,
        lastActiveMode,
      }}
    >
      {children}
    </OrganizerModeContext.Provider>
  );
};
