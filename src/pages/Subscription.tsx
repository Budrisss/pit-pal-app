import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Shield, Users, Wrench, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";

const freeFeatures = [
  { icon: Wrench, label: "Basic Garage (3 cars)" },
  { icon: Calendar, label: "View & register for events" },
  { icon: Zap, label: "Session tracking" },
];

const proFeatures = [
  { icon: Wrench, label: "Unlimited vehicles & setups" },
  { icon: Calendar, label: "Create personal events" },
  { icon: Shield, label: "Maintenance logs & attachments" },
  { icon: Users, label: "Crew messaging & live crew view" },
  { icon: Zap, label: "Advanced session data & tire tracking" },
  { icon: Crown, label: "Priority support (coming soon)" },
];

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, tier } = useSubscription();
  const [activating, setActivating] = useState(false);

  const handleActivatePro = async () => {
    if (!user) return;
    setActivating(true);
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ tier: "pro" as any })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Welcome to Trackside Pro! 🏁");
      // Force page reload to refresh subscription context
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to activate Pro: " + err.message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="pt-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
            <ArrowLeft size={18} />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Crown className="text-yellow-400" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trackside Pro</h1>
              <p className="text-muted-foreground text-sm">Unlock the full racing toolkit</p>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <Card className="bg-gradient-dark border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-foreground font-medium">Current Plan</span>
            <Badge variant={isPro ? "default" : "secondary"} className={isPro ? "bg-yellow-500 text-black" : ""}>
              {isPro ? "Pro" : "Free"}
            </Badge>
          </CardContent>
        </Card>

        {isPro ? (
          <Card className="bg-gradient-dark border-yellow-500/30">
            <CardContent className="p-6 text-center space-y-3">
              <Crown className="text-yellow-400 mx-auto" size={40} />
              <h2 className="text-xl font-bold text-foreground">You're on Pro!</h2>
              <p className="text-muted-foreground text-sm">You have full access to all Trackside features.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Free Tier */}
            <Card className="bg-gradient-dark border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">Free Tier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <f.icon size={16} />
                    <span>{f.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="bg-gradient-dark border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-yellow-400 flex items-center gap-2">
                  <Crown size={18} />
                  Pro — Free During Beta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {proFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check size={16} className="text-green-400" />
                    <span>{f.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CTA */}
            <Button
              variant="pulse"
              className="w-full h-12 text-base"
              onClick={handleActivatePro}
              disabled={activating}
            >
              <Crown size={18} />
              {activating ? "Activating…" : "Activate Pro (Free Beta)"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              No credit card required. Pro is free during the beta period.
            </p>
          </>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Subscription;
