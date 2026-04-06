import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Car, Calendar, CheckSquare, Settings, Plus, TrendingUp, LogOut, ChevronRight, MapPin } from "lucide-react";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { cars } = useCars();
  const { events } = useEvents();
  const { signOut, user } = useAuth();

  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [localEventsLoading, setLocalEventsLoading] = useState(true);

  // Fetch nearby public events
  useEffect(() => {
    if (!user) return;
    const fetchLocal = async () => {
      setLocalEventsLoading(true);
      try {
        const { data: loc } = await supabase
          .from('user_locations')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .maybeSingle();

        if (loc) {
          const { data } = await supabase.rpc('events_within_radius', {
            user_lat: Number(loc.latitude),
            user_lng: Number(loc.longitude),
            radius_miles: 100,
          });
          setLocalEvents((data || []).slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching local events:', err);
      } finally {
        setLocalEventsLoading(false);
      }
    };
    fetchLocal();
  }, [user]);

  const totalChecklists = 3;
  const completedChecklists = 1;

  const upcomingEvents = events.filter(e => e.status === "upcoming");
  const nextEvent = upcomingEvents[0];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const quickActions = [
    { icon: Car, label: "Add Car", onClick: () => navigate('/garage') },
    { icon: Calendar, label: "New Event", onClick: () => navigate('/events') },
    { icon: Settings, label: "New Setup", onClick: () => navigate('/setups') },
    { icon: CheckSquare, label: "Checklists", onClick: () => navigate('/checklists') },
  ];

  const stats = [
    { label: "Cars", value: cars.length },
    { label: "Events", value: events.length },
    { label: "Setups", value: cars.reduce((sum, car) => sum + car.setups, 0) },
    { label: "Checklists", value: `${completedChecklists}/${totalChecklists}` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      {/* Nav — matches Landing */}
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
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link to={item.path}>{item.label}</Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut size={16} className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero — matches Landing style */}
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
            className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3 text-center lg:text-left text-primary md:text-5xl"
          >
            Welcome to Race Control
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="bg-card/60 backdrop-blur-md border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors"
              >
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        {/* Quick Actions */}
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
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                onClick={action.onClick}
                className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-4 sm:p-5 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon size={20} className="text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-medium">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Two column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Next Event */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar size={20} className="text-primary" />
                  Next Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextEvent ? (
                  <div className="space-y-3">
                    <h3 className="font-bold text-lg">{nextEvent.name}</h3>
                    <p className="text-muted-foreground text-sm">{nextEvent.track}</p>
                    <p className="text-sm">{nextEvent.date} at {nextEvent.time}</p>
                    <p className="text-sm text-muted-foreground">Car: {nextEvent.car}</p>
                    <Button size="sm" onClick={() => navigate(`/events/${nextEvent.id}`)}>
                      View Details <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">No upcoming events</p>
                    <Button size="sm" onClick={() => navigate('/events')}>
                      <Plus size={16} className="mr-2" /> Create Event
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Garage */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Car size={20} className="text-primary" />
                  Your Garage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cars.length > 0 ? (
                  <div className="space-y-3">
                    {cars.slice(0, 2).map((car) => (
                      <div key={car.id} className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors">
                        <h4 className="font-semibold">{car.name}</h4>
                        <p className="text-sm text-muted-foreground">{car.year} {car.make} {car.model}</p>
                        <p className="text-xs text-muted-foreground">{car.events} events • {car.setups} setups</p>
                      </div>
                    ))}
                    {cars.length > 2 && (
                      <p className="text-sm text-muted-foreground">+{cars.length - 2} more cars</p>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate('/garage')}>
                      View All Cars <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">No cars in garage</p>
                    <Button size="sm" onClick={() => navigate('/garage')}>
                      <Plus size={16} className="mr-2" /> Add Car
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>


        {/* Local Events */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin size={20} className="text-primary" />
                  Local Events
                </span>
                <Button size="sm" variant="ghost" onClick={() => navigate('/local-events')}>
                  View All <ChevronRight size={16} className="ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {localEventsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : localEvents.length > 0 ? (
                <div className="space-y-3">
                  {localEvents.map((ev: any) => (
                    <div key={ev.id} className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors">
                      <h4 className="font-semibold text-sm">{ev.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {ev.track_name && `${ev.track_name} • `}
                        {[ev.city, ev.state].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {ev.entry_fee && ` • ${ev.entry_fee}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-3">No events near you yet.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/local-events')}>
                    Browse All Events <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
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
