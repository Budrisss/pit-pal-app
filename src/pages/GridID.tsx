import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import GridPassportCard from "@/components/GridPassportCard";
import StampCard from "@/components/StampCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCars } from "@/contexts/CarsContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Shield, Edit, Save, X } from "lucide-react";

const GridID = () => {
  const { user } = useAuth();
  const { cars } = useCars();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [stamps, setStamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      // Fetch or create racer profile
      let { data: rp } = await supabase
        .from("racer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!rp) {
        const { data: created } = await supabase
          .from("racer_profiles")
          .insert({ user_id: user.id, display_name: user.email?.split("@")[0] || "Racer" })
          .select()
          .single();
        rp = created;
      }

      setProfile(rp);
      setDisplayName(rp?.display_name || "");
      setBio(rp?.bio || "");

      // Fetch stamps
      const { data: st } = await supabase
        .from("grid_stamps")
        .select("*")
        .eq("racer_id", user.id)
        .order("date", { ascending: false });

      setStamps(st || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    const { error } = await supabase
      .from("racer_profiles")
      .update({ display_name: displayName, bio })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Failed to save profile", variant: "destructive" });
    } else {
      setProfile({ ...profile, display_name: displayName, bio });
      setEditing(false);
      toast({ title: "Profile updated" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <DesktopNavigation />
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-24 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="size-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">GridID</h1>
          </div>

          <GridPassportCard
            displayName={profile?.display_name || "Racer"}
            totalHours={profile?.total_track_hours || 0}
            carCount={cars.length}
            memberSince={profile?.created_at || new Date().toISOString()}
            userId={user!.id}
          />
        </motion.div>

        {/* Edit Profile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <Card className="border border-border/60 bg-card/70">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Profile</CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Edit className="size-4" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                      <X className="size-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile}>
                      <Save className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <>
                  <div>
                    <Label>Display Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell organizers about your racing experience..." />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-foreground">{profile?.display_name}</p>
                  {profile?.bio && <p className="text-xs text-muted-foreground">{profile.bio}</p>}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stamps History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <h2 className="text-lg font-bold text-foreground mb-3 uppercase tracking-wide">Verified Track Stamps</h2>
          {stamps.length === 0 ? (
            <Card className="border border-border/60 bg-card/70">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No stamps yet. Organizers will add stamps after your track sessions.
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
      <Navigation />
    </div>
  );
};

export default GridID;
