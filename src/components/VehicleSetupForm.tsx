import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Calendar, MapPin, Clock, Save } from "lucide-react";
import TireWearPhotos, { TirePhoto } from "@/components/TireWearPhotos";

interface UserCar {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
}

interface UserEvent {
  id: string;
  name: string;
  date: string;
  track_id: string;
  address?: string;
  trackName?: string;
}

interface Session {
  id: string;
  name: string;
  type: string;
  event_id: string;
}

interface SetupFormData {
  setup_name: string;
  car_id: string;
  event_id: string;
  session_id: string;
  fastest_lap_time: string;
  lf_camber: number;
  rf_camber: number;
  lr_camber: number;
  rr_camber: number;
  lf_toe: number;
  rf_toe: number;
  lr_toe: number;
  rr_toe: number;
  lf_caster: number;
  rf_caster: number;
  lf_ride_height: number;
  rf_ride_height: number;
  lr_ride_height: number;
  rr_ride_height: number;
  lf_spring: number;
  rf_spring: number;
  lr_spring: number;
  rr_spring: number;
  lf_shock: number;
  rf_shock: number;
  lr_shock: number;
  rr_shock: number;
  fl_cold_pressure: number;
  fr_cold_pressure: number;
  rl_cold_pressure: number;
  rr_cold_pressure: number;
  fl_hot_pressure: number;
  fr_hot_pressure: number;
  rl_hot_pressure: number;
  rr_hot_pressure: number;
  front_percentage: number;
  rear_percentage: number;
  cross_percentage: number;
  left_percentage: number;
  right_percentage: number;
  notes_times: string;
}

export const VehicleSetupForm = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [cars, setCars] = useState<UserCar[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [resolvedTrack, setResolvedTrack] = useState("");
  const [tirePhotos, setTirePhotos] = useState<TirePhoto[]>([]);

  const form = useForm<SetupFormData>();

  useEffect(() => {
    if (user) {
      fetchCars();
      fetchUserEvents();
      fetchUnlinkedTirePhotos();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      fetchSessions();
      const evt = userEvents.find((e) => e.id === selectedEvent);
      setResolvedTrack(evt?.trackName || evt?.address || "");
    } else {
      setSessions([]);
      setSelectedSession("");
      setResolvedTrack("");
    }
  }, [selectedEvent, userEvents]);

  const fetchCars = async () => {
    const { data } = await (supabase as any)
      .from("cars")
      .select("id, name, make, model, year")
      .order("name");
    if (data) setCars(data);
  };

  const fetchUserEvents = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("events")
      .select("id, name, date, track_id, address, track_name:tracks(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (data) {
      setUserEvents(
        data.map((row: any) => ({
          ...row,
          trackName: row.track_name?.name || row.address || "",
        }))
      );
    }
  };

  const fetchSessions = async () => {
    const { data } = await (supabase as any)
      .from("sessions")
      .select("id, name, type, event_id")
      .eq("event_id", selectedEvent)
      .order("created_at");
    if (data) setSessions(data);
  };

  const fetchUnlinkedTirePhotos = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("setup_tire_photos")
      .select("*")
      .eq("user_id", user.id)
      .is("setup_id", null)
      .order("created_at", { ascending: false });
    if (data) {
      const resolved = await Promise.all(
        data.map(async (p: any) => {
          let storagePath = p.file_url;
          if (storagePath.includes("/setup-attachments/")) {
            storagePath = decodeURIComponent(storagePath.split("/setup-attachments/").pop()!);
          }
          const { data: signed } = await supabase.storage
            .from("setup-attachments")
            .createSignedUrl(storagePath, 3600);
          return { ...p, file_url: signed?.signedUrl || p.file_url };
        })
      );
      setTirePhotos(resolved);
    }
  };

  const onSubmit = async (data: SetupFormData) => {
    if (!user) return;
    try {
      const sessionObj = sessions.find((s) => s.id === selectedSession);
      const { data: inserted, error } = await (supabase as any)
        .from("setup_data")
        .insert({
          ...data,
          user_id: user.id,
          car_id: selectedCar || null,
          event_id: selectedEvent || null,
          session_id: selectedSession || null,
          session_name: sessionObj?.name || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Link any unlinked tire photos to the new setup
      if (inserted?.id && tirePhotos.length > 0) {
        await (supabase as any)
          .from("setup_tire_photos")
          .update({ setup_id: inserted.id })
          .eq("user_id", user.id)
          .is("setup_id", null);
      }

      toast({
        title: "Setup Saved",
        description: "Vehicle setup has been saved successfully",
      });

      form.reset();
      setSelectedCar("");
      setSelectedEvent("");
      setSelectedSession("");
      setResolvedTrack("");
      fetchUnlinkedTirePhotos();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save setup",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="text-primary" />
          Vehicle Chassis Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Setup Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="setup_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dry Weather Setup" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {userEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {event.name} - {new Date(event.date).toLocaleDateString()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Car</Label>
                <Select value={selectedCar} onValueChange={setSelectedCar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select car" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        <div className="flex items-center gap-2">
                          <Car size={14} />
                          {car.name} {car.year && car.make && `(${car.year} ${car.make} ${car.model})`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Track (auto-resolved from event) */}
              {resolvedTrack && (
                <div className="space-y-2">
                  <Label>Track / Venue</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/50">
                    <MapPin size={14} className="text-primary" />
                    {resolvedTrack}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession} disabled={!selectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedEvent ? "Select session" : "Select event first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {session.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="fastest_lap_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fastest Lap</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1:23.456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Suspension Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Suspension Settings</h3>

              {/* Camber */}
              <div className="space-y-2">
                <h4 className="font-medium">Camber (degrees)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="lf_camber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LF Camber</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="-2.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rf_camber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RF Camber</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="-2.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lr_camber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LR Camber</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="-1.8" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rr_camber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RR Camber</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="-1.8" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Toe */}
              <div className="space-y-2">
                <h4 className="font-medium">Toe (degrees)</h4>
                <p className="text-xs text-muted-foreground">Positive = toe-in, negative = toe-out</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="lf_toe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LF Toe</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.10" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rf_toe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RF Toe</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.10" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lr_toe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LR Toe</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.05" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rr_toe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RR Toe</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.05" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Caster (front only) */}
              <div className="space-y-2">
                <h4 className="font-medium">Caster (degrees)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="lf_caster" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LF Caster</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="6.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rf_caster" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RF Caster</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="6.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Ride Height */}
              <div className="space-y-2">
                <h4 className="font-medium">Ride Height (inches)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="lf_ride_height" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LF Height</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="4.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rf_ride_height" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RF Height</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="4.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lr_ride_height" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LR Height</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="5.0" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rr_ride_height" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RR Height</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="5.0" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Springs */}
              <div className="space-y-2">
                <h4 className="font-medium">Spring Rates (lb/in)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="lf_spring" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LF Spring</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="550" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rf_spring" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RF Spring</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="550" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lr_spring" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LR Spring</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="175" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rr_spring" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RR Spring</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="175" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Shocks */}
              <div className="space-y-2">
                <h4 className="font-medium">Shock Settings</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="lf_shock" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LF Shock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rf_shock" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RF Shock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lr_shock" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LR Shock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rr_shock" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RR Shock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Weight Distribution */}
              <div className="space-y-2">
                <h4 className="font-medium">Weight Distribution (%)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <FormField control={form.control} name="front_percentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Front %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="52.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rear_percentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rear %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="47.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="left_percentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Left %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="50.0" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="right_percentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Right %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="50.0" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cross_percentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cross %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="51.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Tire Pressures */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tire Pressures (psi)</h3>
                <div className="space-y-2">
                  <h4 className="font-medium">Cold Pressure</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="fl_cold_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>LF Cold</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="28" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fr_cold_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>RF Cold</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="28" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rl_cold_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>LR Cold</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="26" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rr_cold_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>RR Cold</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="26" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Hot Pressure</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="fl_hot_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>LF Hot</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="32" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fr_hot_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>RF Hot</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="32" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rl_hot_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>LR Hot</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="30" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rr_hot_pressure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>RR Hot</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="30" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              {/* Tire Wear Photos */}
              {user && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Tire Wear Photos</h3>
                  <p className="text-xs text-muted-foreground">Capture wear pattern for each corner. Photos upload now and link to this setup when saved.</p>
                  <TireWearPhotos
                    setupId={null}
                    userId={user.id}
                    photos={tirePhotos}
                    onChanged={fetchUnlinkedTirePhotos}
                  />
                </div>
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes_times"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Notes & Times</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes about handling, lap times, weather conditions, etc."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              Save Vehicle Setup
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
