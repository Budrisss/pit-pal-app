import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  setOnboardingCompleted: (value: boolean) => void;
  refreshOnboarding: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean | null>(null);
  const hasRestoredSession = useRef(false);

  const loadOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from("racer_profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();
    setOnboardingCompletedState(!data ? false : data.onboarding_completed !== false);
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          // Defer DB call to avoid deadlocks inside the auth callback
          setTimeout(() => {
            if (isMounted) loadOnboarding(nextSession.user.id);
          }, 0);
        } else {
          setOnboardingCompletedState(null);
        }

        if (hasRestoredSession.current) {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      if (!isMounted) return;

      hasRestoredSession.current = true;
      setSession(restoredSession);
      setUser(restoredSession?.user ?? null);
      if (restoredSession?.user) {
        loadOnboarding(restoredSession.user.id);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handlePopoutSessionRequest = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "trackside:session-request") return;
      if (!session?.access_token || !session?.refresh_token || !event.source) return;

      event.source.postMessage(
        {
          type: "trackside:session-response",
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
        },
        event.origin,
      );
    };

    window.addEventListener("message", handlePopoutSessionRequest);
    return () => window.removeEventListener("message", handlePopoutSessionRequest);
  }, [session]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const setOnboardingCompleted = (value: boolean) => {
    setOnboardingCompletedState(value);
  };

  const refreshOnboarding = async () => {
    if (user) await loadOnboarding(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, onboardingCompleted, setOnboardingCompleted, refreshOnboarding, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
