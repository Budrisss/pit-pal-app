import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface OrganizerModeContextType {
  isOrganizer: boolean;
  isApproved: boolean;
  isOrganizerMode: boolean;
  orgStatusLoading: boolean;
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

const cacheKey = (uid: string) => `tso:orgStatus:${uid}`;

type CachedOrgStatus = {
  isOrganizer: boolean;
  isApproved: boolean;
  organizerProfileId: string | null;
  lastActiveMode: "racer" | "organizer" | null;
};

const readCache = (uid: string): CachedOrgStatus | null => {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    return JSON.parse(raw) as CachedOrgStatus;
  } catch {
    return null;
  }
};

const writeCache = (uid: string, value: CachedOrgStatus) => {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export const OrganizerModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [organizerProfileId, setOrganizerProfileId] = useState<string | null>(null);
  const [lastActiveMode, setLastActiveMode] = useState<"racer" | "organizer" | null>(null);
  const [orgStatusLoading, setOrgStatusLoading] = useState(true);
  const [bootRedirectChecked, setBootRedirectChecked] = useState(false);

  // Mode is now derived from the URL — the source of truth is "are we inside /organizer/*?"
  const isOrganizerMode = location.pathname.startsWith("/organizer") && location.pathname !== "/organizer/apply";

  useEffect(() => {
    if (!user) {
      setIsOrganizer(false);
      setIsApproved(false);
      setOrganizerProfileId(null);
      setLastActiveMode(null);
      setOrgStatusLoading(false);
      setBootRedirectChecked(false);
      return;
    }

    // Hydrate from cache synchronously so the shell can render immediately
    // on refresh without bouncing while the network call is in flight.
    const cached = readCache(user.id);
    if (cached) {
      setIsOrganizer(cached.isOrganizer);
      setIsApproved(cached.isApproved);
      setOrganizerProfileId(cached.organizerProfileId);
      if (cached.lastActiveMode) setLastActiveMode(cached.lastActiveMode);
      setOrgStatusLoading(false);
    } else {
      setOrgStatusLoading(true);
    }

    let cancelled = false;
    (async () => {
      try {
        const [orgRes, racerRes] = await Promise.all([
          supabase
            .from("organizer_profiles")
            .select("id, approved")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("racer_profiles")
            .select("last_active_mode")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const orgData = orgRes.data;
        const orgErr = orgRes.error;
        const racerData = racerRes.data as any;

        // Only flip flags from confirmed query results. On transient error,
        // preserve the cached values rather than silently dropping the user
        // back to the racer side.
        let nextIsOrganizer = isOrganizer;
        let nextIsApproved = isApproved;
        let nextProfileId = organizerProfileId;
        if (!orgErr) {
          nextIsOrganizer = !!orgData;
          nextIsApproved = !!orgData?.approved;
          nextProfileId = orgData?.id || null;
          setIsOrganizer(nextIsOrganizer);
          setIsApproved(nextIsApproved);
          setOrganizerProfileId(nextProfileId);
        }

        let nextMode: "racer" | "organizer" | null = lastActiveMode;
        const m = racerData?.last_active_mode;
        if (m === "racer" || m === "organizer") {
          nextMode = m;
          setLastActiveMode(m);
        } else if (!lastActiveMode) {
          nextMode = "racer";
          setLastActiveMode("racer");
        }

        writeCache(user.id, {
          isOrganizer: nextIsOrganizer,
          isApproved: nextIsApproved,
          organizerProfileId: nextProfileId,
          lastActiveMode: nextMode,
        });
      } catch (err) {
        // Keep cached values; just log.
        // eslint-disable-next-line no-console
        console.warn("OrganizerMode: failed to refresh status", err);
      } finally {
        if (!cancelled) setOrgStatusLoading(false);
      }
    })();

    // Clean up legacy toggle key
    localStorage.removeItem("organizerMode");

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const persistMode = async (mode: "racer" | "organizer") => {
    setLastActiveMode(mode);
    if (user) {
      const cached = readCache(user.id);
      writeCache(user.id, {
        isOrganizer: cached?.isOrganizer ?? isOrganizer,
        isApproved: cached?.isApproved ?? isApproved,
        organizerProfileId: cached?.organizerProfileId ?? organizerProfileId,
        lastActiveMode: mode,
      });
    }
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

  // Boot-time mode restoration: if the user's last active mode was "organizer"
  // and they're approved, send them back to /organizer when they land on a
  // neutral racer route (root or dashboard). Runs once per provider mount.
  useEffect(() => {
    if (!user) return;
    if (orgStatusLoading) return;
    if (bootRedirectChecked) return;
    setBootRedirectChecked(true);

    const path = location.pathname;
    const onNeutralRacerLanding = path === "/" || path === "/dashboard";
    if (
      onNeutralRacerLanding &&
      lastActiveMode === "organizer" &&
      isApproved
    ) {
      navigate("/organizer", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orgStatusLoading, lastActiveMode, isApproved, bootRedirectChecked]);

  return (
    <OrganizerModeContext.Provider
      value={{
        isOrganizer,
        isApproved,
        isOrganizerMode,
        orgStatusLoading,
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
