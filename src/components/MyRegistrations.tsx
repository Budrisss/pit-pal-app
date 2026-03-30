import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Registration {
  id: string;
  event_id: string;
  registration_type_id: string;
  user_name: string;
  car_number: number | null;
  car_id: string | null;
  created_at: string;
  event?: {
    id: string;
    name: string;
    date: string;
    time: string | null;
    track_name: string | null;
    city: string | null;
    state: string | null;
  };
  reg_type?: {
    name: string;
  };
  car?: {
    name: string;
    year: string;
    make: string;
    model: string;
  };
}

const MyRegistrations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("id, event_id, registration_type_id, user_name, car_number, car_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!regs || regs.length === 0) {
        setRegistrations([]);
        setLoading(false);
        return;
      }

      const eventIds = [...new Set(regs.map((r) => r.event_id))];
      const regTypeIds = [...new Set(regs.map((r) => r.registration_type_id))];
      const carIds = [...new Set(regs.map((r) => r.car_id).filter(Boolean))] as string[];

      const promises: Promise<any>[] = [
        supabase.from("public_events").select("id, name, date, time, track_name, city, state").in("id", eventIds),
        supabase.from("registration_types").select("id, name").in("id", regTypeIds),
      ];
      if (carIds.length > 0) {
        promises.push((supabase as any).from("cars").select("id, name, year, make, model").in("id", carIds));
      }

      const results = await Promise.all(promises);
      const events = results[0].data;
      const regTypes = results[1].data;
      const carsData = carIds.length > 0 ? results[2]?.data : [];

      const eventMap = Object.fromEntries((events || []).map((e: any) => [e.id, e]));
      const regTypeMap = Object.fromEntries((regTypes || []).map((r: any) => [r.id, r]));
      const carMap = Object.fromEntries((carsData || []).map((c: any) => [c.id, c]));

      setRegistrations(
        regs.map((r) => ({
          ...r,
          event: eventMap[r.event_id],
          reg_type: regTypeMap[r.registration_type_id],
          car: r.car_id ? carMap[r.car_id] : undefined,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, [user]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base sm:text-lg">
            <Ticket size={20} className="text-primary" />
            My Registrations
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : registrations.length > 0 ? (
          <div className="space-y-3">
            {registrations.slice(0, 4).map((reg) => (
              <div
                key={reg.id}
                className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/public-event/${reg.event_id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{reg.event?.name || "Event"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {reg.event?.track_name && `${reg.event.track_name} • `}
                      {[reg.event?.city, reg.event?.state].filter(Boolean).join(", ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays size={12} />
                        {reg.event?.date ? formatDate(reg.event.date) : "—"}
                      </span>
                      {reg.reg_type && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {reg.reg_type.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
                </div>
              </div>
            ))}
            {registrations.length > 4 && (
              <p className="text-xs text-muted-foreground text-center">+{registrations.length - 4} more</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm mb-3">You haven't registered for any events yet.</p>
            <Button size="sm" variant="outline" onClick={() => navigate("/local-events")}>
              Browse Events <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyRegistrations;
