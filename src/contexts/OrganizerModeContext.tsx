import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OrganizerModeContextType {
  isOrganizer: boolean;
  isApproved: boolean;
  isOrganizerMode: boolean;
  toggleMode: () => void;
  organizerProfileId: string | null;
}

const OrganizerModeContext = createContext<OrganizerModeContextType | undefined>(undefined);

export const useOrganizerMode = () => {
  const context = useContext(OrganizerModeContext);
  if (!context) throw new Error("useOrganizerMode must be used within OrganizerModeProvider");
  return context;
};

export const OrganizerModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [organizerProfileId, setOrganizerProfileId] = useState<string | null>(null);
  const [isOrganizerMode, setIsOrganizerMode] = useState(() => {
    return localStorage.getItem("organizerMode") === "true";
  });

  useEffect(() => {
    if (!user) {
      setIsOrganizer(false);
      setIsApproved(false);
      setOrganizerProfileId(null);
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
        if (!data || !data.approved) {
          setIsOrganizerMode(false);
          localStorage.removeItem("organizerMode");
        }
      });
  }, [user]);

  const toggleMode = () => {
    setIsOrganizerMode((prev) => {
      const next = !prev;
      localStorage.setItem("organizerMode", String(next));
      return next;
    });
  };

  return (
    <OrganizerModeContext.Provider value={{ isOrganizer, isApproved, isOrganizerMode, toggleMode, organizerProfileId }}>
      {children}
    </OrganizerModeContext.Provider>
  );
};
