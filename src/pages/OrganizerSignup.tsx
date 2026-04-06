import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Phone, Globe, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import DesktopNavigation from '@/components/DesktopNavigation';

import pitLaneHero from '@/assets/pit-lane-hero.jpg';
import tracksideLogo from '@/assets/trackside-logo-v2.png';

const OrganizerSignup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    org_name: '',
    contact_email: '',
    phone: '',
    website: '',
    description: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('organizer_profiles').insert({
        user_id: user.id,
        org_name: form.org_name,
        contact_email: form.contact_email,
        phone: form.phone || null,
        website: form.website || null,
        description: form.description || null,
      });

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "Your organizer application is pending approval. You'll be able to create events once approved.",
      });
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === '23505') {
        toast({
          title: "Already registered",
          description: "You're already an organizer. Head to Local Events to create one!",
        });
        navigate('/local-events');
      } else {
        toast({
          title: "Registration failed",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-0">
      <DesktopNavigation />

      {/* Hero */}
      <section className="relative pt-0 lg:pt-20 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${pitLaneHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6 lg:hidden"
          >
            <img src={tracksideLogo} alt="Track Side Ops" className="h-12 w-auto invert" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-center"
          >
            Become an <span className="text-primary">Organizer</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-muted-foreground text-center mb-8 max-w-md mx-auto"
          >
            Register your organization to create and manage public racing events that racers can discover.
          </motion.p>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="org_name">Organization Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="org_name"
                  value={form.org_name}
                  onChange={e => handleChange('org_name', e.target.value)}
                  className="pl-10"
                  placeholder="Speed Demons Racing Club"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={e => handleChange('contact_email', e.target.value)}
                  className="pl-10"
                  placeholder="events@yourorg.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="+1 555-0123"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    id="website"
                    type="url"
                    value={form.website}
                    onChange={e => handleChange('website', e.target.value)}
                    className="pl-10"
                    placeholder="https://yourorg.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About Your Organization</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Tell racers about your events and what makes them special..."
                rows={4}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full font-bold py-3 text-base" size="lg">
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Register as Organizer <ChevronRight size={20} className="ml-1" /></>
              )}
            </Button>
          </form>
        </motion.div>
      </section>

      <Navigation />
    </div>
  );
};

export default OrganizerSignup;
