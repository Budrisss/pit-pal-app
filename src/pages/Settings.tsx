import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, User, Bell, Car, Database, Camera, LogOut, MapPin, ArrowLeft } from "lucide-react";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import OrganizerSettings from "@/pages/OrganizerSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import RacingGallery from "@/components/RacingGallery";
import SavedTracksManager from "@/components/SavedTracksManager";
import MyRegistrations from "@/components/MyRegistrations";

const Settings = () => {
  const { isOrganizerMode } = useOrganizerMode();
  const [showGallery, setShowGallery] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState('');
  const [savedZip, setSavedZip] = useState('');
  const [savingZip, setSavingZip] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchLocation = async () => {
      const { data } = await supabase
        .from('user_locations')
        .select('zip_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setZipCode(data.zip_code);
        setSavedZip(data.zip_code);
      }
    };
    fetchLocation();
  }, [user]);

  const handleSaveZip = async () => {
    if (!user || !/^\d{5}$/.test(zipCode)) {
      toast({ title: "Invalid ZIP", description: "Enter a valid 5-digit US ZIP code.", variant: "destructive" });
      return;
    }
    setSavingZip(true);
    try {
      const { data: geo, error: geoErr } = await supabase.functions.invoke('geocode-zip', {
        body: { zip_code: zipCode },
      });
      if (geoErr || !geo?.success) throw new Error(geo?.error || 'Failed to geocode ZIP');

      const { error } = await supabase.from('user_locations').upsert({
        user_id: user.id,
        zip_code: zipCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
      }, { onConflict: 'user_id' });

      if (error) throw error;
      setSavedZip(zipCode);
      toast({ title: "Location saved!", description: `Set to ${geo.city}, ${geo.state} (${zipCode})` });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSavingZip(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (isOrganizerMode) {
    return <OrganizerSettings />;
  }

  if (showGallery) {
    return <RacingGallery onClose={() => setShowGallery(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="pt-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
            <ArrowLeft size={18} />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm">Customize your motorsport app</p>
        </div>

        {/* Profile Section */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <User className="text-primary" size={20} />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Driver Name</label>
              <p className="text-foreground font-medium">John Racer</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Primary Vehicle</label>
              <p className="text-foreground font-medium">2018 Mazda MX-5 Miata</p>
            </div>
            <Button variant="outline" size="sm">Edit Profile</Button>
          </CardContent>
        </Card>

        {/* My Registrations */}
        <MyRegistrations />

        {/* Location */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <MapPin className="text-primary" size={20} />
              Your Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">Set your ZIP code to discover local events within 100 miles.</p>
            <div className="flex gap-2">
              <Input
                value={zipCode}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Enter ZIP code"
                maxLength={5}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveZip}
                disabled={savingZip || zipCode === savedZip}
              >
                {savingZip ? '...' : 'Save'}
              </Button>
            </div>
            {savedZip && <p className="text-xs text-muted-foreground">Current: {savedZip}</p>}
          </CardContent>
        </Card>

        {/* Saved Tracks */}
        <SavedTracksManager />


        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Bell className="text-primary" size={20} />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Event Reminders</p>
                <p className="text-xs text-muted-foreground">Get notified before track events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Setup Changes</p>
                <p className="text-xs text-muted-foreground">Alert when setup is modified</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Checklist Completion</p>
                <p className="text-xs text-muted-foreground">Notify when lists are complete</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Settings */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Car className="text-primary" size={20} />
              Vehicle Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Pressure Units</p>
                <p className="text-xs text-muted-foreground">PSI or BAR</p>
              </div>
              <p className="text-muted-foreground">PSI</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Temperature Units</p>
                <p className="text-xs text-muted-foreground">Fahrenheit or Celsius</p>
              </div>
              <p className="text-muted-foreground">°F</p>
            </div>
            <Button variant="outline" size="sm">Manage Vehicles</Button>
          </CardContent>
        </Card>

        {/* Racing Gallery */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Camera className="text-primary" size={20} />
              Racing Gallery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">Browse GT cars and race car collection</p>
            <Button 
              variant="pulse" 
              onClick={() => setShowGallery(true)}
              className="w-full"
            >
              <Camera size={16} />
              View Racing Gallery
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Database className="text-primary" size={20} />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" size="sm" className="w-full">
              Export Data
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Import Data
            </Button>
            <Button variant="destructive" size="sm" className="w-full">
              Reset All Data
            </Button>
          </CardContent>
        </Card>

        {/* Account / Logout */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <LogOut className="text-primary" size={20} />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">Signed in as {user?.email}</p>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
      <Navigation />
    </div>
  );
};

export default Settings;