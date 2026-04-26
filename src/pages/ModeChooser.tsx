import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { supabase } from "@/integrations/supabase/client";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

const REMEMBER_KEY = "tso_mode_remember";

const ModeChooser = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isOrganizer, isApproved, lastActiveMode, enterOrganizerMode, exitOrganizerMode } = useOrganizerMode();
  const [remember, setRemember] = useState(false);
  const [autoChecked, setAutoChecked] = useState(false);

  // Auto-route if a "remember" hint is set
  useEffect(() => {
    if (loading || !user || autoChecked) return;
    const hint = localStorage.getItem(REMEMBER_KEY);
    if (hint === "organizer" && isApproved) {
      void enterOrganizerMode();
      setAutoChecked(true);
    } else if (hint === "racer") {
      navigate("/dashboard", { replace: true });
      setAutoChecked(true);
    } else {
      setAutoChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isApproved]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  // Anyone who isn't an approved organizer doesn't need a chooser
  if (!isApproved) return <Navigate to="/dashboard" replace />;

  const choose = async (mode: "racer" | "organizer") => {
    if (remember) localStorage.setItem(REMEMBER_KEY, mode);
    else localStorage.removeItem(REMEMBER_KEY);
    if (mode === "organizer") await enterOrganizerMode();
    else await exitOrganizerMode();
  };

  const racerHighlight = lastActiveMode !== "organizer";
  const orgHighlight = lastActiveMode === "organizer";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <motion.img
        src={tracksideLogo}
        alt="Track Side Ops"
        className="h-12 w-auto invert mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      />
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-center">
        Welcome back
      </h1>
      <p className="text-muted-foreground text-center mb-10 max-w-md">
        You wear two hats. Which one today?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => choose("racer")}
          className={`text-left rounded-xl p-6 border-2 transition-all bg-card ${
            racerHighlight ? "border-primary shadow-f1" : "border-border hover:border-primary/60"
          }`}
        >
          <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 bg-gradient-f1">
            <Car className="text-white" size={28} />
          </div>
          <h2 className="text-xl font-bold mb-1">Continue as Racer</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Garage, setups, events you're attending, and your GridID.
          </p>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Enter Garage <ArrowRight size={16} />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => choose("organizer")}
          className={`text-left rounded-xl p-6 border-2 transition-all bg-card ${
            orgHighlight ? "shadow-org" : "hover:border-org/60"
          }`}
          style={{
            borderColor: orgHighlight ? "hsl(var(--org-accent))" : undefined,
            boxShadow: orgHighlight ? "var(--shadow-org)" : undefined,
          }}
        >
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center mb-4"
            style={{ background: "var(--gradient-org)" }}
          >
            <Briefcase className="text-white" size={28} />
          </div>
          <h2 className="text-xl font-bold mb-1">Continue as Organizer</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Run your events, manage registrations, issue stamps, go live.
          </p>
          <div
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "hsl(var(--org-accent))" }}
          >
            Enter Control Tower <ArrowRight size={16} />
          </div>
        </motion.button>
      </div>

      <label className="flex items-center gap-2 mt-8 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="accent-primary"
        />
        Remember my choice on this device
      </label>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground"
        onClick={() => { localStorage.removeItem(REMEMBER_KEY); }}
      >
        Clear remembered choice
      </Button>
    </div>
  );
};

export default ModeChooser;