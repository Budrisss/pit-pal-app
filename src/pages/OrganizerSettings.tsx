import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  CalendarCog,
  Users,
  LogOut,
  Save,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

interface OrganizerProfile {
  id: string;
  org_name: string;
  contact_email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
}

interface DefaultSession {
  name: string;
  start_time: string;
  duration_minutes: number | null;
}

const OrganizerSettings = () => {
  const { signOut, user } = useAuth();
  const { organizerProfileId } = useOrganizerMode();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Organization Profile
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  // Event Defaults
  const [defaultDuration, setDefaultDuration] = useState("20");
  const [defaultRegTypes, setDefaultRegTypes] = useState("Beginner\nIntermediate\nAdvanced");
  const [defaultSessions, setDefaultSessions] = useState<DefaultSession[]>([]);

  // Notification Preferences
  const [notifNewReg, setNotifNewReg] = useState(true);
  const [notifCancelReg, setNotifCancelReg] = useState(true);
  const [notifSessionReminder, setNotifSessionReminder] = useState(true);
  const [notifAnnouncement, setNotifAnnouncement] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!organizerProfileId) return;

    // Fetch profile and settings in parallel
    const fetchProfile = supabase
      .from("organizer_profiles")
      .select("id, org_name, contact_email, phone, website, description")
      .eq("id", organizerProfileId)
      .maybeSingle();

    const fetchSettings = supabase
      .from("organizer_settings" as any)
      .select("*")
      .eq("organizer_profile_id", organizerProfileId)
      .maybeSingle();

    Promise.all([fetchProfile, fetchSettings]).then(([profileRes, settingsRes]) => {
      if (profileRes.data) {
        setProfile(profileRes.data);
        setOrgName(profileRes.data.org_name);
        setContactEmail(profileRes.data.contact_email);
        setPhone(profileRes.data.phone || "");
        setWebsite(profileRes.data.website || "");
        setDescription(profileRes.data.description || "");
      }
      if (settingsRes.data) {
        const s = settingsRes.data as any;
        setDefaultDuration(String(s.default_session_duration));
        setDefaultRegTypes(s.default_reg_types);
        setNotifNewReg(s.notif_new_registration);
        setNotifCancelReg(s.notif_cancel_registration);
        setNotifSessionReminder(s.notif_session_reminder);
        setNotifAnnouncement(s.notif_announcement_confirm);
      }
    });
  }, [organizerProfileId]);

  const handleSaveProfile = async () => {
    if (!organizerProfileId) return;
    if (!orgName.trim() || !contactEmail.trim()) {
      toast({ title: "Required fields", description: "Organization name and contact email are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("organizer_profiles")
      .update({
        org_name: orgName.trim(),
        contact_email: contactEmail.trim(),
        phone: phone.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
      })
      .eq("id", organizerProfileId);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
  };

  const handleSaveDefaults = async () => {
    if (!organizerProfileId) return;
    setSavingSettings(true);
    const payload = {
      organizer_profile_id: organizerProfileId,
      default_session_duration: parseInt(defaultDuration),
      default_reg_types: defaultRegTypes,
      notif_new_registration: notifNewReg,
      notif_cancel_registration: notifCancelReg,
      notif_session_reminder: notifSessionReminder,
      notif_announcement_confirm: notifAnnouncement,
    };
    const { error } = await supabase
      .from("organizer_settings" as any)
      .upsert(payload as any, { onConflict: "organizer_profile_id" });
    setSavingSettings(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved!" });
    }
  };

  const handleToggleNotif = (value: boolean, setter: (v: boolean) => void) => {
    setter(value);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="text-primary" />
            Organizer Settings
          </h1>
          <p className="text-muted-foreground text-sm">Manage your organization and event preferences</p>
        </div>

        {/* Organization Profile */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Building2 className="text-primary" size={20} />
              Organization Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Your org name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell drivers about your organization..." rows={3} />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Staff / Co-organizers */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Users className="text-primary" size={20} />
              Staff / Co-organizers
              <Badge variant="secondary" className="ml-auto text-xs">Coming Soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">Invite team members to help manage your events.</p>
            <div className="space-y-3 opacity-50 pointer-events-none">
              <div className="flex gap-2">
                <Input placeholder="team@example.com" className="flex-1" disabled />
                <Select disabled>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access</SelectItem>
                    <SelectItem value="readonly">Read Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" disabled>Invite</Button>
              </div>
              <div className="rounded-md border border-border/30 p-3">
                <p className="text-sm text-muted-foreground">No team members yet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Defaults */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <CalendarCog className="text-primary" size={20} />
              Event Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">Set defaults for new events you create.</p>
            <div className="space-y-2">
              <Label>Default Session Duration</Label>
              <Select value={defaultDuration} onValueChange={setDefaultDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="25">25 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Registration Types</Label>
              <Textarea
                value={defaultRegTypes}
                onChange={(e) => setDefaultRegTypes(e.target.value)}
                placeholder="One per line"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One type per line</p>
            </div>
            <Button onClick={handleSaveDefaults} variant="outline" className="w-full" disabled={savingSettings}>
              <Save size={16} className="mr-2" />
              {savingSettings ? "Saving..." : "Save Defaults & Notifications"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-gradient-dark border-border/50">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Bell className="text-primary" size={20} />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">New Registrations</p>
                <p className="text-xs text-muted-foreground">Alert when a driver registers</p>
              </div>
              <Switch checked={notifNewReg} onCheckedChange={(v) => handleToggleNotif(v, setNotifNewReg)} />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Registration Cancellations</p>
                <p className="text-xs text-muted-foreground">Alert when a driver cancels</p>
              </div>
              <Switch checked={notifCancelReg} onCheckedChange={(v) => handleToggleNotif(v, setNotifCancelReg)} />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Session Reminders</p>
                <p className="text-xs text-muted-foreground">Remind before sessions start</p>
              </div>
              <Switch checked={notifSessionReminder} onCheckedChange={(v) => handleToggleNotif(v, setNotifSessionReminder)} />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-foreground">Announcement Confirmations</p>
                <p className="text-xs text-muted-foreground">Confirm when announcements are delivered</p>
              </div>
              <Switch checked={notifAnnouncement} onCheckedChange={(v) => handleToggleNotif(v, setNotifAnnouncement)} />
            </div>
          </CardContent>
        </Card>

        {/* Account */}
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

export default OrganizerSettings;
