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
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  id: string;
  name: string;
  start_time: string;
  duration_minutes: number | null;
  run_group: string | null;
}

let sessionIdCounter = 0;
const genSessionId = () => `ds-${Date.now()}-${++sessionIdCounter}`;

interface SortableSessionCardProps {
  session: DefaultSession;
  index: number;
  defaultDuration: string;
  runGroupNames: string[];
  onUpdate: (index: number, session: DefaultSession) => void;
  onRemove: (index: number) => void;
}

const SortableSessionCard = ({ session, index, defaultDuration, runGroupNames, onUpdate, onRemove }: SortableSessionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30 relative">
      <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
      >
        <X size={14} />
      </Button>
      <div className="pl-6 pr-6">
        <div className="space-y-1">
          <Label className="text-xs">Session Name</Label>
          <Input
            value={session.name}
            onChange={(e) => onUpdate(index, { ...session, name: e.target.value })}
            placeholder="e.g. Group 1 - Morning Run"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pl-6">
        <div className="space-y-1">
          <Label className="text-xs">Start Time</Label>
          <Input
            type="time"
            value={session.start_time || ''}
            onChange={(e) => onUpdate(index, { ...session, start_time: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duration (min)</Label>
          <Input
            type="number"
            value={session.duration_minutes ?? ''}
            onChange={(e) => onUpdate(index, { ...session, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
            placeholder={defaultDuration}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Run Group</Label>
          <Select
            value={session.run_group || "all"}
            onValueChange={(val) => onUpdate(index, { ...session, run_group: val === "all" ? null : val })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {runGroupNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

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

  // Parsed run group names for session assignment
  const runGroupNames = defaultRegTypes.split("\n").map(s => s.trim()).filter(Boolean);

  // Notification Preferences
  const [notifNewReg, setNotifNewReg] = useState(true);
  const [notifCancelReg, setNotifCancelReg] = useState(true);
  const [notifSessionReminder, setNotifSessionReminder] = useState(true);
  const [notifAnnouncement, setNotifAnnouncement] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = defaultSessions.findIndex(s => s.id === active.id);
      const newIndex = defaultSessions.findIndex(s => s.id === over.id);
      setDefaultSessions(arrayMove(defaultSessions, oldIndex, newIndex));
    }
  };

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
        setDefaultSessions(Array.isArray(s.default_sessions) ? s.default_sessions.map((sess: any, idx: number) => ({ ...sess, id: sess.id || genSessionId() })) : []);
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

    // Save profile and settings/defaults together
    const profilePromise = supabase
      .from("organizer_profiles")
      .update({
        org_name: orgName.trim(),
        contact_email: contactEmail.trim(),
        phone: phone.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
      })
      .eq("id", organizerProfileId);

    const settingsPayload = {
      organizer_profile_id: organizerProfileId,
      default_session_duration: parseInt(defaultDuration),
      default_reg_types: defaultRegTypes,
      default_sessions: defaultSessions,
      notif_new_registration: notifNewReg,
      notif_cancel_registration: notifCancelReg,
      notif_session_reminder: notifSessionReminder,
      notif_announcement_confirm: notifAnnouncement,
    };
    const settingsPromise = supabase
      .from("organizer_settings" as any)
      .upsert(settingsPayload as any, { onConflict: "organizer_profile_id" });

    const [profileRes, settingsRes] = await Promise.all([profilePromise, settingsPromise]);
    setSaving(false);

    if (profileRes.error || settingsRes.error) {
      toast({ title: "Failed to save", description: (profileRes.error || settingsRes.error)?.message, variant: "destructive" });
    } else {
      toast({ title: "All settings saved!" });
    }
  };

  const handleSaveDefaults = async () => {
    if (!organizerProfileId) return;
    setSavingSettings(true);
    const payload = {
      organizer_profile_id: organizerProfileId,
      default_session_duration: parseInt(defaultDuration),
      default_reg_types: defaultRegTypes,
      default_sessions: defaultSessions,
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
              {saving ? "Saving..." : "Save All Settings"}
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
              <Label>Default Run Groups</Label>
              <Textarea
                value={defaultRegTypes}
                onChange={(e) => setDefaultRegTypes(e.target.value)}
                placeholder="One per line"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One run group per line</p>
            </div>

            {/* Default Session Schedule */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Clock size={14} /> Default Session Schedule
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDefaultSessions([...defaultSessions, { id: genSessionId(), name: '', start_time: '', duration_minutes: parseInt(defaultDuration) || 20, run_group: null }])}
                >
                  <Plus size={14} className="mr-1" /> Add Session
                </Button>
              </div>
              {defaultSessions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No default sessions. Add sessions to pre-populate new events.</p>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={defaultSessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {defaultSessions.map((session, i) => (
                    <SortableSessionCard
                      key={session.id}
                      session={session}
                      index={i}
                      defaultDuration={defaultDuration}
                      runGroupNames={runGroupNames}
                      onUpdate={(idx, updated) => {
                        const arr = [...defaultSessions];
                        arr[idx] = updated;
                        setDefaultSessions(arr);
                      }}
                      onRemove={(idx) => setDefaultSessions(defaultSessions.filter((_, j) => j !== idx))}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <p className="text-xs text-muted-foreground">Changes are saved when you click "Save Profile" above.</p>
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
