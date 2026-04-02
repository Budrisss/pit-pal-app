import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

import pitLaneHero from '@/assets/pit-lane-hero.jpg';
import tracksideLogo from '@/assets/trackside-logo-v2.png';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20">
          <Link to="/" className="flex items-center h-full py-1">
            <img src={tracksideLogo} alt="Track Side Ops" className="h-full w-auto object-contain invert" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Home</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero section with form */}
      <section className="relative pt-16 sm:pt-20 min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${pitLaneHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />

        <div className="relative z-10 w-full max-w-md mx-auto px-5 sm:px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Log in to your garage and get back on track.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-6 sm:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Enter email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter password"
                    required
                    minLength={6}
                  />
                </div>
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-muted-foreground hover:text-primary text-xs transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-bold py-3 text-base"
                size="lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><LogIn size={20} className="mr-2" /> Enter Garage</>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/signup"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Don't have an account?{' '}
                <span className="text-primary font-medium">Sign up</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Login;
