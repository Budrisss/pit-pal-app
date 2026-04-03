import { useState, useEffect } from "react";
import { Wrench, ChevronDown, ChevronUp, Upload, Car, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleSetupForm } from "@/components/VehicleSetupForm";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import SetupAttachments from "@/components/SetupAttachments";

interface SetupAttachment {
  id: string;
  setup_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

interface SavedSetup {
  id: string;
  setup_name: string | null;
  session_name: string | null;
  car_id: string | null;
  event_id: string | null;
  created_at: string;
  fastest_lap_time: string | null;
  notes_times: string | null;
}

const Setups = () => {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([]);
  const [allAttachments, setAllAttachments] = useState<SetupAttachment[]>([]);
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSetups();
      fetchAttachments();
    }
  }, [user]);

  const fetchSetups = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_data")
      .select("id, setup_name, session_name, car_id, event_id, created_at, fastest_lap_time, notes_times")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setSavedSetups(data);
  };

  const fetchAttachments = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_attachments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setAllAttachments(data);
  };

  const generalAttachments = allAttachments.filter((a) => !a.setup_id);
  const getSetupAttachments = (setupId: string) => allAttachments.filter((a) => a.setup_id === setupId);

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="text-primary" />
              Vehicle Setups
            </h1>
            <p className="text-muted-foreground text-sm">Create and manage your chassis setups</p>
          </div>
        </div>

        {/* General Upload (unlinked files) */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload size={20} className="text-primary" />
              General Setup Sheets
            </CardTitle>
            <p className="text-muted-foreground text-xs">Upload images or PDFs not linked to a specific setup</p>
          </CardHeader>
          <CardContent>
            {user && (
              <SetupAttachments
                attachments={generalAttachments}
                setupId={null}
                userId={user.id}
                onChanged={fetchAttachments}
              />
            )}
          </CardContent>
        </Card>

        {/* Saved Setups List */}
        {savedSetups.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Saved Setups</h2>
            {savedSetups.map((setup) => {
              const isExpanded = expandedSetup === setup.id;
              const setupAtts = getSetupAttachments(setup.id);
              return (
                <Card key={setup.id} className="border-border/50">
                  <CardHeader
                    className="pb-2 cursor-pointer"
                    onClick={() => setExpandedSetup(isExpanded ? null : setup.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wrench size={16} className="text-primary" />
                          {setup.setup_name || "Untitled Setup"}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {setup.session_name && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {setup.session_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {new Date(setup.created_at).toLocaleDateString()}
                          </span>
                          {setup.fastest_lap_time && (
                            <Badge variant="secondary" className="text-[10px]">
                              {setup.fastest_lap_time}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {setupAtts.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {setupAtts.length} file{setupAtts.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      {setup.notes_times && (
                        <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{setup.notes_times}</p>
                      )}
                      {user && (
                        <SetupAttachments
                          attachments={setupAtts}
                          setupId={setup.id}
                          userId={user.id}
                          onChanged={fetchAttachments}
                          compact
                        />
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Collapsible Chassis Setup Form */}
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Wrench size={16} className="text-primary" />
                Chassis Setup Form
              </span>
              {formOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <VehicleSetupForm />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Navigation />
    </div>
  );
};

export default Setups;
