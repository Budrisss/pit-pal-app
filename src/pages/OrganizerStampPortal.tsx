import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { useOrganizerMode } from "@/contexts/OrganizerModeContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Search, Stamp, CheckCircle, Star } from "lucide-react";

const OrganizerStampPortal = () => {
  const { organizerProfileId } = useOrganizerMode();
  const { toast } = useToast();

  const [searchEmail, setSearchEmail] = useState("");
  const [foundRacer, setFoundRacer] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [trackName, setTrackName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupLevel, setGroupLevel] = useState("");
  const [hours, setHours] = useState("1");
  const [rating, setRating] = useState("0");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setFoundRacer(null);

    // Look up user by email via racer_profiles join isn't possible directly.
    // We search racer_profiles by display_name or we need a different approach.
    // Since we can't query auth.users, we'll search by matching the user_id 
    // through a workaround: search racer_profiles where display_name matches email prefix
    // Better: use the email as a lookup. We'll need to find user_id from event_registrations.
    const { data } = await supabase
      .from("event_registrations")
      .select("user_id, user_name, user_email")
      .ilike("user_email", searchEmail.trim())
      .limit(1);

    if (data && data.length > 0) {
      const reg = data[0];
      // Check if they have a racer profile
      const { data: rp } = await supabase
        .from("racer_profiles")
        .select("*")
        .eq("user_id", reg.user_id)
        .maybeSingle();

      setFoundRacer({
        user_id: reg.user_id,
        display_name: rp?.display_name || reg.user_name,
        total_track_hours: rp?.total_track_hours || 0,
        email: reg.user_email,
      });
    } else {
      toast({ title: "No racer found with that email", variant: "destructive" });
    }
    setSearching(false);
  };

  const handleSubmitStamp = async () => {
    if (!foundRacer || !trackName.trim() || !organizerProfileId) return;
    setSubmitting(true);

    const { error } = await supabase.from("grid_stamps").insert({
      racer_id: foundRacer.user_id,
      organizer_id: organizerProfileId,
      track_name: trackName.trim(),
      date,
      group_level: groupLevel || null,
      hours: parseFloat(hours) || 1,
      rating: parseInt(rating) > 0 ? parseInt(rating) : null,
      comments: comments.trim() || null,
    });

    if (error) {
      toast({ title: "Failed to add stamp", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Stamp added successfully!" });
      // Reset form
      setTrackName("");
      setGroupLevel("");
      setHours("1");
      setRating("0");
      setComments("");
      setTimeout(() => setSubmitted(false), 3000);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <DesktopNavigation />
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-24 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Stamp className="size-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">Issue Stamp</h1>
          </div>

          {/* Search */}
          <Card className="border border-border/60 bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Find Racer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Racer email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  <Search className="size-4" />
                </Button>
              </div>

              {foundRacer && (
                <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{foundRacer.display_name}</p>
                    <p className="text-xs text-muted-foreground">{foundRacer.email} · {foundRacer.total_track_hours} hrs</p>
                  </div>
                  <CheckCircle className="size-5 text-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stamp Form */}
        {foundRacer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-border/60 bg-card/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stamp Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Track Name *</Label>
                  <Input value={trackName} onChange={(e) => setTrackName(e.target.value)} placeholder="e.g. Road Atlanta" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Hours</Label>
                    <Input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Group Level</Label>
                  <Select value={groupLevel} onValueChange={setGroupLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rating</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRating(rating === String(v) ? "0" : String(v))}
                        className="p-1"
                      >
                        <Star
                          className={`size-6 transition-colors ${
                            v <= parseInt(rating) ? "text-primary fill-primary" : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Comments</Label>
                  <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional feedback..." rows={2} />
                </div>
                <Button onClick={handleSubmitStamp} disabled={submitting || !trackName.trim()} className="w-full">
                  {submitted ? "Stamp Added ✓" : submitting ? "Submitting..." : "Issue Stamp"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default OrganizerStampPortal;
