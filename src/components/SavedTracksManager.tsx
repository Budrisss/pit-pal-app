import { useState, useEffect } from "react";
import { MapPin, Trash2, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Track {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

const SavedTracksManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTracks = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tracks")
      .select("id, name, address, city, state")
      .order("name");
    if (!error) setTracks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTracks();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("tracks").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      setTracks((prev) => prev.filter((t) => t.id !== deleteId));
      toast({ title: "Track deleted" });
    }
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <>
      <Card className="bg-gradient-dark border-border/50">
        <CardHeader>
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <Navigation className="text-primary" size={20} />
            Saved Tracks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Tracks saved from address search appear here and in the event creation dropdown.
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved tracks yet. Search an address when creating an event and tap "Save as Track."
            </p>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-start justify-between gap-2 p-3 rounded-lg border border-border/50 bg-background/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[track.address, track.city, track.state].filter(Boolean).join(", ") || "No address"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(track.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete track?</AlertDialogTitle>
            <AlertDialogDescription>
              This track will be removed from your saved list. This won't affect existing events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SavedTracksManager;
