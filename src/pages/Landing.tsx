import { Link } from 'react-router-dom';
import { Car, Gauge, Calendar, Wrench, BarChart3, CheckSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

import pitLaneHero from '@/assets/pit-lane-hero.jpg';

const features = [
  {
    icon: Car,
    title: 'Garage Management',
    description: 'Track every detail of your cars — specs, mods, and maintenance history in one place.',
  },
  {
    icon: Calendar,
    title: 'Event Planning',
    description: 'Organize track days, races, and testing sessions with weather and schedule integration.',
  },
  {
    icon: Wrench,
    title: 'Setup Sheets',
    description: 'Log suspension, tire pressures, and chassis settings. Compare across sessions instantly.',
  },
  {
    icon: BarChart3,
    title: 'Session Analysis',
    description: 'Record lap times, tire data, and notes for every session to find speed over time.',
  },
  {
    icon: CheckSquare,
    title: 'Checklists',
    description: 'Never forget a tool or step — build reusable pre-event and pit-stop checklists.',
  },
  {
    icon: Gauge,
    title: 'Dashboard Overview',
    description: 'See upcoming events, recent sessions, and car stats at a glance from one screen.',
  },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="flex items-center">
            <span className="text-lg sm:text-xl font-bold tracking-tight">TRACK SIDE</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" className="sm:size-default" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" className="sm:size-default" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-16 sm:pt-24 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${pitLaneHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background sm:from-background/70 sm:via-background/60" />
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-32 md:py-44 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-4 sm:mb-6"
          >
            Your Pit Crew,<br />
            <span className="text-primary">In Your Pocket</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10"
          >
            TRACK SIDE is the all-in-one racing companion for grassroots and amateur racers.
            Manage your garage, plan events, dial in setups, and analyse every session.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-8 py-5 sm:py-6" asChild>
              <Link to="/signup">
                Start For Free <ChevronRight size={20} className="ml-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-8 py-5 sm:py-6 border-primary/40 hover:bg-primary/10" asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features — compact horizontal cards on mobile, grid on desktop */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Everything You Need at the Track</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            From pre-event prep to post-session review — TRACK SIDE covers every step of your race weekend.
          </p>
        </motion.div>
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:border-primary/50 transition-colors flex sm:flex-col items-start gap-3 sm:gap-0"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 sm:mb-4">
                <f.icon size={20} className="sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-0.5 sm:mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to Hit the Track?</h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Join racers who trust TRACK SIDE to keep their weekends organized and their setups dialed.
          </p>
          <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-10 py-5 sm:py-6" asChild>
            <Link to="/signup">Create Your Free Account <ChevronRight size={20} className="ml-1" /></Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Car size={16} className="sm:w-[18px] sm:h-[18px] text-primary" />
            <span>TRACK SIDE</span>
          </div>
          <span>© {new Date().getFullYear()} Track Side. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
