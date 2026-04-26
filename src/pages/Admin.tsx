import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, CheckCircle, XCircle, Users, Building2, CreditCard, RadioTower } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrganizerProfile {
  id: string;
  user_id: string;
  org_name: string;
  contact_email: string;
  approved: boolean;
  created_at: string;
  description: string | null;
  website: string | null;
  phone: string | null;
}

interface UserSubscription {
  id: string;
  user_id: string;
  tier: "free" | "pro";
  created_at: string;
}

interface AuthUserLite {
  id: string;
  email: string | null;
}

const Admin = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const [orgRes, subRes] = await Promise.all([
      supabase.from("organizer_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    if (orgRes.data) setOrganizers(orgRes.data);
    if (subRes.data) setSubscriptions(subRes.data as UserSubscription[]);
    setLoadingData(false);
  };

  const handleApproveOrganizer = async (id: string, approve: boolean) => {
    const { error } = await supabase
      .from("organizer_profiles")
      .update({ approved: approve })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: approve ? "Organizer approved" : "Organizer rejected" });
      fetchData();
    }
  };

  const handleUpdateTier = async (userId: string, tier: "free" | "pro") => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ tier })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Tier updated to ${tier}` });
      fetchData();
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const pendingOrganizers = organizers.filter((o) => !o.approved);
  const approvedOrganizers = organizers.filter((o) => o.approved);

  return (
    <div className="min-h-screen bg-gradient-dark p-4 space-y-6">
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="mb-2 -ml-2">
          <ArrowLeft size={18} />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm">Manage organizers, users, and subscriptions</p>
      </div>

      {/* Dev tools */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <RadioTower className="text-primary" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">LoRa Sim</p>
              <p className="text-xs text-muted-foreground">Test failover before LoRaWAN hardware arrives</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/admin/lora-sim")}>Open</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-1">
            <Building2 size={14} />
            Pending ({pendingOrganizers.length})
          </TabsTrigger>
          <TabsTrigger value="organizers" className="flex items-center gap-1">
            <CheckCircle size={14} />
            Organizers
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users size={14} />
            Users
          </TabsTrigger>
        </TabsList>

        {/* Pending Organizer Approvals */}
        <TabsContent value="pending" className="space-y-4">
          {pendingOrganizers.length === 0 ? (
            <Card className="bg-gradient-dark border-border/50">
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending organizer applications.
              </CardContent>
            </Card>
          ) : (
            pendingOrganizers.map((org) => (
              <Card key={org.id} className="bg-gradient-dark border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground flex items-center justify-between">
                    {org.org_name}
                    <Badge variant="secondary">Pending</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{org.contact_email}</p>
                  {org.description && <p className="text-sm text-foreground">{org.description}</p>}
                  {org.website && (
                    <p className="text-sm text-muted-foreground">Website: {org.website}</p>
                  )}
                  {org.phone && <p className="text-sm text-muted-foreground">Phone: {org.phone}</p>}
                  <p className="text-xs text-muted-foreground">
                    Applied: {new Date(org.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleApproveOrganizer(org.id, true)}>
                      <CheckCircle size={14} className="mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleApproveOrganizer(org.id, false)}>
                      <XCircle size={14} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Approved Organizers */}
        <TabsContent value="organizers" className="space-y-4">
          <Card className="bg-gradient-dark border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedOrganizers.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium text-foreground">{org.org_name}</TableCell>
                      <TableCell className="text-muted-foreground">{org.contact_email}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/20 text-green-400">Approved</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApproveOrganizer(org.id, false)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvedOrganizers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No approved organizers yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Subscriptions */}
        <TabsContent value="users" className="space-y-4">
          <Card className="bg-gradient-dark border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs text-foreground">
                        {sub.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sub.tier === "pro"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {sub.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {sub.tier === "pro" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateTier(sub.user_id, "free")}
                          >
                            Downgrade
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateTier(sub.user_id, "pro")}
                          >
                            Upgrade
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
