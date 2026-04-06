import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Car, Calendar, CheckSquare, Settings, Plus, TrendingUp,
  LogOut, ChevronRight, MapPin, Timer, Clock, Flag, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { useCars } from "@/contexts/CarsContext";
import { useEvents } from "@/contexts/EventsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

import dashboardHero from "@/assets/dashboard-hero.jpg";
import tracksideLogo from "@/assets/trackside-logo-v2.png";

const CountdownUnit = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-background/80 border border-primary/30 rounded-lg w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
      <span className="text-xl sm:text-2xl font-bold font-mono text-primary">{value}</span>
    </div>
    <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 uppercase tracking-widest font-medium">{label}</span>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { cars } = useCars();
  const { events } = useEvents();
  const { signOut, user } = useAuth();

  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [localEventsLoading, setLocalEventsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchLocal = async () => {
      setLocalEventsLoading(true);
      try {
        const { data: loc } = await supabase
          .from("user_locations")
          .select("latitude, longitude")
          .eq("user_id", user.id)
          .maybeSingle();

        if (loc) {
          const { data } = await supabase.rpc("events_within_radius", {
            user_lat: Number(loc.latitude),
            user_lng: Number(loc.longitude),
            radius_miles: 100,
          });
          setLocalEvents((data || []).slice(0, 3));
        }
      } catch (err) {
        console.error("Error fetching local events:", err);
      } finally {
        setLocalEventsLoading(false);
      }
    };
    fetchLocal();
  }, [user]);

  const totalChecklists = 3;
  const completedChecklists = 1;

  const upcomingEvents = events.filter((e) => e.status === "upcoming");
  const nextEvent = upcomingEvents[0];

  // Live segmented countdown
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0, active: false });
  useEffect(() => {
    if (!nextEvent) {
      setCd({ d: 0, h: 0, m: 0, s: 0, active: false });
      return;
    }
    const tick = () => {
      const diff = nextEvent.eventDate.getTime() - Date.now();
      if (diff <= 0) {
        setCd({ d: 0, h: 0, m: 0, s: 0, active: true });
        return;
      }
      setCd({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        active: true,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextEvent]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const quickActions = [
    { icon: Car, label: "Garage", desc: "Manage cars", onClick: () => navigate("/garage") },
    { icon: Calendar, label: "Events", desc: "Track schedule", onClick: () => navigate("/events") },
    { icon: Gauge, label: "Setups", desc: "Car setups", onClick: () => navigate("/setups") },
    { icon: CheckSquare, label: "Checklists", desc: "Prep lists", onClick: () => navigate("/checklists") },
  ];

  const stats = [
    { label: "Cars", value: cars.length, icon: Car },
    { label: "Events", value: events.length, icon: Calendar },
    { label: "Setups", value: cars.reduce((sum, car) => sum + car.setups, 0), icon: Gauge },
    { label: "Checklists", value: `${completedChecklists}/${totalChecklists}`, icon: CheckSquare },
  ];

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

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
              { label: "Events", path: "/events" },
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
            <img src={tracksideLogo} alt="Track Side Ops" className="h-20 w-auto invert" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter leading-none mb-3 text-center lg:text-left uppercase"
          >
            <span className="text-foreground">Welcome to</span>
            <br />
            <span className="text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]">Race Control</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8 text-center lg:text-left mx-auto lg:mx-0"
          >
            Everything you need for your next race weekend, all in one place.
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">

        {/* ─── Next Event ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
        >
          {nextEvent ? (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/70 backdrop-blur-xl">
              {/* Decorative accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

              <div className="relative p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Flag size={16} className="text-primary" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Next Event</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">{nextEvent.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-primary/70" />
                        {nextEvent.track}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-primary/70" />
                        {nextEvent.date} · {nextEvent.time}
                      </span>
                      {nextEvent.car && (
                        <span className="flex items-center gap-1.5">
                          <Car size={14} className="text-primary/70" />
                          {nextEvent.car}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate(`/events/${nextEvent.id}`)}
                    >
                      View Details <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>

                  {/* Segmented countdown */}
                  {cd.active && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CountdownUnit value={String(cd.d).padStart(2, "0")} label="Days" />
                      <span className="text-primary/40 text-xl font-bold -mt-5">:</span>
                      <CountdownUnit value={String(cd.h).padStart(2, "0")} label="Hours" />
                      <span className="text-primary/40 text-xl font-bold -mt-5">:</span>
                      <CountdownUnit value={String(cd.m).padStart(2, "0")} label="Min" />
                      <span className="text-primary/40 text-xl font-bold -mt-5">:</span>
                      <CountdownUnit value={String(cd.s).padStart(2, "0")} label="Sec" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Card className="bg-card/70 backdrop-blur-xl border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar size={24} className="text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">No upcoming events scheduled</p>
                <Button size="sm" onClick={() => navigate("/events")}>
                  <Plus size={16} className="mr-2" /> Create Event
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* ─── Quick Actions ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
                onClick={action.onClick}
                className="group relative bg-card/80 backdrop-blur-md border border-border rounded-xl p-4 sm:p-5 flex flex-col items-center gap-2.5 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.1)]"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <action.icon size={22} className="text-primary" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold block">{action.label}</span>
                  <span className="text-[10px] text-muted-foreground">{action.desc}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ─── Two column: Garage + Local Events ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Garage */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/40 transition-all duration-300 h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base sm:text-lg">
                    <Car size={20} className="text-primary" />
                    Your Garage
                  </span>
                  {cars.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => navigate("/garage")} className="text-xs">
                      View All <ChevronRight size={14} className="ml-0.5" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cars.length > 0 ? (
                  <div className="space-y-2.5">
                    {cars.slice(0, 3).map((car) => (
                      <div
                        key={car.id}
                        className="group border border-border rounded-lg p-3 hover:border-primary/30 transition-all duration-200 cursor-pointer hover:bg-primary/5"
                        onClick={() => navigate("/garage")}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{car.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {car.year} {car.make} {car.model}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {car.events} events · {car.setups} setups
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {cars.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">+{cars.length - 3} more</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Car size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">No cars in garage</p>
                    <Button size="sm" onClick={() => navigate("/garage")}>
                      <Plus size={16} className="mr-2" /> Add Car
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Local Events */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/40 transition-all duration-300 h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base sm:text-lg">
                    <MapPin size={20} className="text-primary" />
                    Local Events
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => navigate("/local-events")} className="text-xs">
                    View All <ChevronRight size={14} className="ml-0.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {localEventsLoading ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">Finding events near you…</p>
                  </div>
                ) : localEvents.length > 0 ? (
                  <div className="space-y-2.5">
                    {localEvents.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="group border border-border rounded-lg p-3 hover:border-primary/30 transition-all duration-200 cursor-pointer hover:bg-primary/5"
                        onClick={() => navigate("/local-events")}
                      >
                        <h4 className="font-semibold text-sm">{ev.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {ev.track_name && `${ev.track_name} · `}
                          {[ev.city, ev.state].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {ev.entry_fee && ` · ${ev.entry_fee}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <MapPin size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">No events near you yet</p>
                    <Button size="sm" variant="outline" onClick={() => navigate("/local-events")}>
                      Browse All Events <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 mb-20 lg:mb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
          <img src={tracksideLogo} alt="Track Side Ops" className="h-10 w-auto invert" />
          <span>© {new Date().getFullYear()} Track Side. All rights reserved.</span>
        </div>
      </footer>

      <Navigation />
    </div>
  );
};

export default Dashboard;
