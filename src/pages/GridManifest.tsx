import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import StampCard from "@/components/StampCard";
import { Shield, Clock, Car, Wrench } from "lucide-react";
import { motion } from "framer-motion";

const GridManifest = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [stamps, setStamps] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [profileRes, stampsRes] = await Promise.all([
        supabase.from("racer_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("grid_stamps").select("*").eq("racer_id", userId).order("date", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setStamps(stampsRes.data || []);

      // Cars are user-owned with RLS, so this will only work if the viewer is the owner
      // For public manifest, we show stamp data which is the primary info
      setLoading(false);
    };
    fetchAll();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center text-muted-foreground">
            GridID not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <Card className="border-2 border-primary/30 bg-card/90 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="size-5 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Safety Manifest</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">{profile.display_name || "Racer"}</h1>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                  <Clock className="size-3" />
                  {profile.total_track_hours} verified hours
                </Badge>
              </div>
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-3">{profile.bio}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stamps */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-bold text-foreground mb-3 uppercase tracking-wide">
            Track History ({stamps.length} session{stamps.length !== 1 ? "s" : ""})
          </h2>
          {stamps.length === 0 ? (
            <Card className="border border-border/60 bg-card/70">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No verified sessions yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {stamps.map((stamp) => (
                <StampCard
                  key={stamp.id}
                  trackName={stamp.track_name}
                  date={stamp.date}
                  groupLevel={stamp.group_level}
                  hours={stamp.hours}
                  rating={stamp.rating}
                  comments={stamp.comments}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GridManifest;
