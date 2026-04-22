import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const OnboardingProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const didPrefill = useRef(false);

  useEffect(() => {
    if (didPrefill.current) return;
    if (user?.email) {
      const handle = user.email.split('@')[0].replace(/[._-]+/g, ' ');
      setDisplayName(handle.charAt(0).toUpperCase() + handle.slice(1));
      didPrefill.current = true;
    }
  }, [user]);

  const markComplete = async () => {
    if (!user) return;
    await supabase.from('racer_profiles').upsert(
      {
        user_id: user.id,
        display_name: displayName.trim() || (user.email?.split('@')[0] ?? 'Racer'),
        onboarding_completed: true,
      },
      { onConflict: 'user_id' }
    );
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('racer_profiles').upsert(
        { user_id: user.id, display_name: user.email?.split('@')[0] ?? 'Racer', onboarding_completed: true },
        { onConflict: 'user_id' }
      );
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName.trim()) {
      toast({ title: 'Driver name required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let primaryCarId: string | null = null;

      const hasVehicle = year.trim() || make.trim() || model.trim();
      if (hasVehicle) {
        const carName = [year, make, model].filter(Boolean).join(' ').trim() || 'My Car';
        const { data: car, error: carErr } = await supabase
          .from('cars')
          .insert({
            user_id: user.id,
            name: carName,
            year: year ? parseInt(year, 10) : null,
            make: make.trim() || null,
            model: model.trim() || null,
            notes: notes.trim() || null,
          })
          .select('id')
          .single();
        if (carErr) throw carErr;
        primaryCarId = car.id;
      }

      const { error: profErr } = await supabase.from('racer_profiles').upsert(
        {
          user_id: user.id,
          display_name: displayName.trim(),
          onboarding_completed: true,
          ...(primaryCarId ? { primary_car_id: primaryCarId } : {}),
        },
        { onConflict: 'user_id' }
      );
      if (profErr) throw profErr;

      toast({ title: 'Profile saved!', description: 'Welcome to the grid.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Failed to save profile', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground flex items-center gap-2">
            <User className="text-primary" />
            Complete Your Profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tell us a bit about yourself and your primary vehicle. You can change this later.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <Label htmlFor="displayName">Driver Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name on the grid"
                required
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Car size={18} className="text-primary" />
                Primary Vehicle
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="year" className="text-xs">Year</Label>
                  <Input
                    id="year"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="2018"
                  />
                </div>
                <div>
                  <Label htmlFor="make" className="text-xs">Make</Label>
                  <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Mazda" />
                </div>
                <div>
                  <Label htmlFor="model" className="text-xs">Model</Label>
                  <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="MX-5" />
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">Class / Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="HPDE Group B, Spec Miata, etc."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save & Continue'}
              </Button>
              <Button type="button" variant="ghost" disabled={saving} onClick={handleSkip} className="w-full">
                Skip for now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingProfile;