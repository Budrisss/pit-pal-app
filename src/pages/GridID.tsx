import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import GridPassportCard from "@/components/GridPassportCard";
import StampCard from "@/components/StampCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCars } from "@/contexts/CarsContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Shield, Edit, Save, X, LogOut, Award, Clock, Sparkles, MapPin, TrendingUp, BadgeCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";

import dashboardHero from "@/assets/dashboard-hero.jpg";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

const GridID = () => {
  const { user, signOut } = useAuth();
  const { cars } = useCars();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const stats = [
    { label: "Track Hours", value: profile?.total_track_hours || 0, icon: Clock },
    { label: "Cars", value: cars.length, icon: Shield },
    { label: "Stamps", value: stamps.length, icon: Award },
  ];

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border hidden lg:block"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-20">
          <Link to="/dashboard" className="flex items-center h-full py-1">
            <img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" />
          </Link>
          <div className="flex items-center gap-1">
            {[
              { label: "Home", path: "/dashboard" },
              { label: "Garage", path: "/garage" },
              { label: "GridID", path: "/grid-id" },
              { label: "Events", path: "/events" },
              { label: "Local Events", path: "/local-events" },
              { label: "Organizer", path: "/event-organizer" },
              { label: "Settings", path: "/settings" },
            ].map((item) => (
              <Button key={item.path} variant={location.pathname === item.path ? "default" : "ghost"} size="sm" asChild>
                <Link to={item.path}>{item.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut size={16} className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-0 lg:pt-20 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${dashboardHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20 lg:py-24">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6 lg:hidden"
          >
            <img src={tracksideLogo} alt="Track Side Ops" className="h-32 sm:h-36 w-auto invert" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter leading-none mb-3 text-center lg:text-left uppercase"
          >
            <span className="text-foreground">Grid</span>
            <br />
            <span className="text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]">ID</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8 text-center lg:text-left mx-auto lg:mx-0"
          >
            Your verified racer passport & track history
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3 sm:gap-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="group bg-card/60 backdrop-blur-md border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)]"
              >
                <stat.icon size={16} className="text-primary/60 mx-auto mb-2 group-hover:text-primary transition-colors" />
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-0.5">{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Coming Soon banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_0_40px_hsl(var(--primary)/0.12)]">
            <div className="absolute top-4 right-4 z-10">
              <Badge className="gap-1.5 py-1 px-2.5 text-[10px] uppercase tracking-wider">
                <Sparkles className="size-3" /> Coming Soon
              </Badge>
            </div>
            <CardContent className="p-6 sm:p-7 space-y-5">
              <div className="space-y-2 pr-24">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                  GridID — Your Verified Racing Identity
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  GridID is your independently-verified digital racing passport. As you log sessions, attend events, and earn organizer stamps, your profile builds a trusted record of your on-track experience — recognized across the Track Side Ops network.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Clock, title: "Track Hours Tracking", desc: "Automatically log every verified hour you spend on track." },
                  { icon: MapPin, title: "Track Diversity", desc: "Build a record of every circuit you've driven, verified by organizers." },
                  { icon: TrendingUp, title: "Lap Time Consistency", desc: "Independent analysis of your consistency across sessions." },
                  { icon: BadgeCheck, title: "Organizer & Instructor Stamps", desc: "Earn approvals from event organizers and certified instructors." },
                  { icon: Shield, title: "Driver Rating", desc: "Receive an independently-calculated rating based on your verified history." },
                  { icon: Users, title: "Smarter Event Grouping", desc: "Organizers use ratings to structure run groups for safer, better racing." },
                ].map((b) => (
                  <div
                    key={b.title}
                    className="flex gap-3 p-3 rounded-lg bg-background/40 border border-border/60 hover:border-primary/40 transition-colors"
                  >
                    <div className="size-8 shrink-0 rounded-md bg-primary/15 flex items-center justify-center">
                      <b.icon className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wide mb-0.5">{b.title}</div>
                      <div className="text-xs text-muted-foreground leading-snug">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-4">
                We're rolling this out with select organizers first. Your stamps and hours are already being recorded — they'll all count when GridID goes live.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
      </section>
      <Navigation />
    </div>
  );
};

export default GridID;
