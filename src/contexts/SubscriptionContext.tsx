import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionContextType {
  tier: "free" | "pro";
  isPro: boolean;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.tier) {
        setTier(data.tier as "free" | "pro");
      } else {
        // Auto-create free tier if missing (for existing users)
        await supabase
          .from("user_subscriptions")
          .insert({ user_id: user.id, tier: "free" as any });
        setTier("free");
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{ tier, isPro: tier === "pro", loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
