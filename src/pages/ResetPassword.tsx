import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

import pitLaneHero from '@/assets/pit-lane-hero.jpg';
import tracksideLogo from '@/assets/trackside-logo-v2.png';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  useEffect(() => {
    // Check if the URL contains a recovery token
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      setIsValidLink(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        </div>
      </motion.nav>

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
              Set New Password
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Choose a strong password for your account.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-6 sm:p-8"
          >
            {!isValidLink ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-sm">
                  This reset link is invalid or has expired. Please request a new one.
                </p>
                <Button asChild>
                  <Link to="/forgot-password">Request New Link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
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
                    <><CheckCircle size={20} className="mr-2" /> Update Password</>
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ResetPassword;
