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
import { Car, Calendar, MapPin, Clock, Save } from "lucide-react";

interface Track {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

interface UserCar {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
}

interface Event {
  id: string;
  name: string;
  date: string;
  track_id: string;
}

interface Session {
  id: string;
  name: string;
  type: 'practice' | 'qualifying' | 'race';
  event_id: string;
}

interface SetupFormData {
  setup_name: string;
  car_id: string;
  event_id: string;
  session_id: string;
  fastest_lap_time: string;
  // Chassis setup fields
  lf_camber: number;
  rf_camber: number;
  lr_camber: number;
  rr_camber: number;
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
  front_percentage: number;
  rear_percentage: number;
  cross_percentage: number;
  left_percentage: number;
  right_percentage: number;
  notes_times: string;
}

export const VehicleSetupForm = () => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cars, setCars] = useState<UserCar[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  
  const form = useForm<SetupFormData>();

  useEffect(() => {
    fetchTracks();
    fetchCars();
  }, []);

  useEffect(() => {
    if (selectedTrack && selectedCar) {
      fetchEvents();
    }
  }, [selectedTrack, selectedCar]);

  useEffect(() => {
    if (selectedEvent) {
      fetchSessions();
    }
  }, [selectedEvent]);

  const fetchTracks = async () => {
    const { data, error } = await (supabase as any)
      .from('tracks')
      .select('id, name, city, state')
      .order('name');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load tracks",
        variant: "destructive",
      });
    } else {
      setTracks(data || []);
    }
  };

  const fetchCars = async () => {
    const { data, error } = await (supabase as any)
      .from('cars')
      .select('id, name, make, model, year')
      .order('name');
    
    if (error) {
      toast({
        title: "Error", 
        description: "Failed to load cars",
        variant: "destructive",
      });
    } else {
      setCars(data || []);
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await (supabase as any)
      .from('events')
      .select('id, name, date, track_id')
      .eq('track_id', selectedTrack)
      .order('date', { ascending: false });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load events", 
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
  };

  const fetchSessions = async () => {
    const { data, error } = await (supabase as any)
      .from('sessions')
      .select('id, name, type, event_id')
      .eq('event_id', selectedEvent)
      .order('created_at');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    } else {
      setSessions((data || []) as Session[]);
    }
  };

  const onSubmit = async (data: SetupFormData) => {
    try {
      const { error } = await (supabase as any)
        .from('setup_data')
        .insert({
          ...data,
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          session_name: sessions.find(s => s.id === data.session_id)?.name || '',
        });

      if (error) throw error;

      toast({
        title: "Setup Saved",
        description: "Vehicle setup has been saved successfully",
      });

      form.reset();
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
                <Label>Track</Label>
                <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} />
                          {track.name} {track.city && `- ${track.city}, ${track.state}`}
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
                          <Car size={16} />
                          {car.name} {car.year && car.make && `(${car.year} ${car.make} ${car.model})`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          {event.name} - {new Date(event.date).toLocaleDateString()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="session_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            <div className="flex items-center gap-2">
                              <Clock size={16} />
                              {session.name} ({session.type})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fastest_lap_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fastest Lap Time</FormLabel>
                    <FormControl>
                      <Input placeholder="1:23.456" {...field} />
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