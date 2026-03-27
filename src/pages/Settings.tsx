import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, User, Bell, Car, Database, Camera, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import RacingGallery from "@/components/RacingGallery";

const Settings = () => {
  const [showGallery, setShowGallery] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (showGallery) {
    return <RacingGallery onClose={() => setShowGallery(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="pt-2">
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

        {/* Notifications */}
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