import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Car, Building, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCars } from "@/contexts/CarsContext";
import { Event } from "@/contexts/EventsContext";
import AddressAutocomplete, { PlaceDetails } from "@/components/AddressAutocomplete";

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (eventData: EventFormData) => void;
  editingEvent?: Event | null;
}

export interface EventFormData {
  name: string;
  track: string;
  date: string;
  time: string;
  car: string;
  car_id?: string;
  address: string;
  isSameDay?: boolean;
}

interface Track {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  isPreset?: boolean;
  track_type?: string;
}

const TRACK_TYPE_LABELS: Record<string, string> = {
  road: "Road Course",
  oval: "Oval",
  drag: "Drag Strip",
  dirt: "Dirt Track",
  kart: "Karting",
  street: "Street Circuit",
  rally: "Rally",
};

const EventForm = ({ open, onOpenChange, onSave, editingEvent }: EventFormProps) => {
  const { cars, getCarDisplayName } = useCars();
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    track: "",
    date: "",
    time: "",
    car: "",
    address: ""
  });
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [presetTracks, setPresetTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [trackTypeFilter, setTrackTypeFilter] = useState<string>("all");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [carComboboxOpen, setCarComboboxOpen] = useState(false);
  const [showSameDayConfirm, setShowSameDayConfirm] = useState(false);
  const [lastPlaceDetails, setLastPlaceDetails] = useState<PlaceDetails | null>(null);
  const [savingTrack, setSavingTrack] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if this is a same-day event - fix timezone handling
    const today = new Date();
    const eventDate = new Date(formData.date);
    const isSameDay = today.toDateString() === eventDate.toDateString();
    
    console.log('Event Form Debug:', {
      today: today.toDateString(),
      eventDate: eventDate.toDateString(),
      formDataDate: formData.date,
      formDataTime: formData.time,
      isSameDay,
      isEditing: !!editingEvent
    });
    
    if (isSameDay && !editingEvent) {
      // Check if event time is past typical session start (8:00 AM)
      const eventTime = new Date(`2000-01-01T${formData.time}`);
      const typicalSessionStart = new Date('2000-01-01T08:00:00');
      const isPastTypicalStart = eventTime > typicalSessionStart;
      
      console.log('Same-day event time check:', {
        eventTime: eventTime.toTimeString(),
        typicalSessionStart: typicalSessionStart.toTimeString(),
        isPastTypicalStart,
        formDataTime: formData.time
      });
      
      if (isPastTypicalStart) {
        console.log('Showing same-day confirmation dialog');
        setShowSameDayConfirm(true);
        return;
      } else {
        console.log('Event time is before 8:00 AM, proceeding without prompt');
      }
    }
    
    // Proceed with normal submission
    const eventDataWithFlag = { ...formData, isSameDay };
    console.log('Proceeding with event creation:', eventDataWithFlag);
    onSave(eventDataWithFlag);
    setFormData({
      name: "",
      track: "",
      date: "",
      time: "",
      car: "",
      address: ""
    });
    onOpenChange(false);
  };

  const handleSameDayConfirm = (confirmed: boolean) => {
    setShowSameDayConfirm(false);
    if (confirmed) {
      const eventDataWithFlag = { ...formData, isSameDay: true };
      onSave(eventDataWithFlag);
      setFormData({
        name: "",
        track: "",
        date: "",
        time: "",
        car: "",
        address: ""
      });
      onOpenChange(false);
    }
  };

  const handleChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTrackSelect = (value: string) => {
    setSelectedTrackId(value);
    setComboboxOpen(false);
    
    if (value === "manual") {
      setFormData(prev => ({ ...prev, track: "", address: "" }));
    } else {
      const selectedTrack = tracks.find(track => track.id === value);
      if (selectedTrack) {
        const fullAddress = `${selectedTrack.address}${selectedTrack.city ? `, ${selectedTrack.city}` : ''}${selectedTrack.state ? `, ${selectedTrack.state}` : ''}`;
        setFormData(prev => ({ 
          ...prev, 
          track: selectedTrack.name,
          address: fullAddress
        }));
      }
    }
  };

  const handleCarSelect = (value: string) => {
    setSelectedCarId(value);
    setCarComboboxOpen(false);
    
    if (value === "manual") {
      setFormData(prev => ({ ...prev, car: "" }));
    } else {
      const selectedCar = cars.find(car => car.id === value);
      if (selectedCar) {
        setFormData(prev => ({ 
          ...prev, 
          car: getCarDisplayName(selectedCar)
        }));
      }
    }
  };

  const getSelectedTrackName = () => {
    if (selectedTrackId === "manual") return "Enter track manually";
    if (!selectedTrackId) return "Select a track...";
    const track = tracks.find(t => t.id === selectedTrackId);
    return track ? `${track.name} - ${track.city}, ${track.state}` : "Select a track...";
  };

  const getSelectedCarName = () => {
    if (selectedCarId === "manual") return "Enter car manually";
    if (!selectedCarId) return "Select a car...";
    const car = cars.find(c => c.id === selectedCarId);
    return car ? getCarDisplayName(car) : "Select a car...";
  };

  // Populate form when editing
  useEffect(() => {
    if (editingEvent && open) {
      const eventDate = new Date(editingEvent.eventDate);
      setFormData({
        name: editingEvent.name,
        track: editingEvent.track,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().slice(0, 5),
        car: editingEvent.car,
        address: editingEvent.address
      });
      setSelectedTrackId("manual");
      setSelectedCarId("manual");
    } else if (!editingEvent && open) {
      // Reset form for new event
      setFormData({
        name: "",
        track: "",
        date: "",
        time: "",
        car: "",
        address: ""
      });
      setSelectedTrackId("");
      setSelectedCarId("");
    }
  }, [editingEvent, open]);

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoadingTracks(true);
      try {
        const [userRes, presetRes] = await Promise.all([
          supabase.from('tracks').select('id, name, address, city, state').order('name'),
          supabase.from('preset_tracks').select('id, name, address, city, state, track_type').order('name'),
        ]);
        
        if (!userRes.error) setTracks(userRes.data || []);
        if (!presetRes.error) setPresetTracks((presetRes.data || []).map((t: any) => ({ ...t, isPreset: true })));
      } catch (error) {
        console.error('Error fetching tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    if (open) {
      fetchTracks();
      setTrackSearch("");
      setTrackTypeFilter("all");
    }
  }, [open]);

  const allFilteredPresets = (trackSearch.length >= 2 || trackTypeFilter !== "all")
    ? presetTracks.filter(t => {
        const matchesType = trackTypeFilter === "all" || t.track_type === trackTypeFilter;
        const matchesSearch = trackSearch.length < 2 || 
          t.name.toLowerCase().includes(trackSearch.toLowerCase()) ||
          (t.city && t.city.toLowerCase().includes(trackSearch.toLowerCase())) ||
          (t.state && t.state.toLowerCase().includes(trackSearch.toLowerCase()));
        return matchesType && matchesSearch;
      })
    : [];
  const filteredPresetTracks = allFilteredPresets.slice(0, 50);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="text-primary" size={24} />
              {editingEvent ? "Edit Event" : "Create New Event"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Calendar size={16} />
                Event Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Thunderhill Track Day"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building size={16} />
                Track/Venue
              </Label>
              <Select value={selectedTrackId} onValueChange={(val) => {
                if (val.startsWith('preset-')) {
                  const presetId = val.replace('preset-', '');
                  const preset = presetTracks.find(t => t.id === presetId);
                  if (preset) {
                    const fullAddress = `${preset.address || ''}${preset.city ? `, ${preset.city}` : ''}${preset.state ? `, ${preset.state}` : ''}`;
                    setFormData(prev => ({ ...prev, track: preset.name, address: fullAddress }));
                    setSelectedTrackId(val);
                  }
                } else {
                  handleTrackSelect(val);
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingTracks ? "Loading tracks..." : "Select a track..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="manual">Enter track manually</SelectItem>
                  {tracks.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Your Saved Tracks</div>
                      {tracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name} - {track.city}, {track.state}
                        </SelectItem>
                      ))}
                    </>
                  )}
                   <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Preset Tracks ({presetTracks.length} total)
                    {(trackSearch.length >= 2 || trackTypeFilter !== "all") && ` — ${allFilteredPresets.length} match${allFilteredPresets.length !== 1 ? 'es' : ''}`}
                    {allFilteredPresets.length > 50 && ` (showing 50)`}
                  </div>
                  <div className="px-2 pb-1 space-y-1">
                    <Input
                      value={trackSearch}
                      onChange={(e) => setTrackSearch(e.target.value)}
                      placeholder={`Search ${presetTracks.length} tracks...`}
                      className="h-8 text-xs"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <div className="flex flex-wrap gap-1">
                      {[{ value: "all", label: "All" }, ...Object.entries(TRACK_TYPE_LABELS).map(([value, label]) => ({ value, label }))].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTrackTypeFilter(value); }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                            trackTypeFilter === value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filteredPresetTracks.map((track) => (
                    <SelectItem key={`preset-${track.id}`} value={`preset-${track.id}`}>
                      <span>{track.name} - {track.city}, {track.state}</span>
                      {track.track_type && (
                        <span className="ml-1 text-[10px] text-muted-foreground">({TRACK_TYPE_LABELS[track.track_type] || track.track_type})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTrackId === "manual" && (
                <Input
                  value={formData.track}
                  onChange={(e) => handleChange("track", e.target.value)}
                  placeholder="e.g., Custom Track Name"
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin size={16} />
                Address (for weather)
              </Label>
              {selectedTrackId === "manual" ? (
                <>
                  <AddressAutocomplete
                    id="address"
                    value={formData.address}
                    onChange={(val) => handleChange("address", val)}
                    onPlaceSelect={(details: PlaceDetails) => {
                      handleChange("address", details.formatted_address);
                      if (!formData.track && details.name) {
                        handleChange("track", details.name);
                      }
                      setLastPlaceDetails(details);
                    }}
                    placeholder="Search for an address..."
                    required
                  />
                  {lastPlaceDetails && formData.address && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      disabled={savingTrack}
                      onClick={async () => {
                        if (!lastPlaceDetails) return;
                        setSavingTrack(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Not authenticated");
                          const trackName = formData.track || lastPlaceDetails.name;
                          const { error } = await supabase.from('tracks').insert({
                            user_id: user.id,
                            name: trackName,
                            address: lastPlaceDetails.formatted_address,
                            city: lastPlaceDetails.city,
                            state: lastPlaceDetails.state,
                          });
                          if (error) throw error;
                          // Refresh tracks list
                          const { data: updatedTracks } = await (supabase as any)
                            .from('tracks')
                            .select('id, name, address, city, state')
                            .order('name');
                          setTracks(updatedTracks || []);
                          setLastPlaceDetails(null);
                          // Find the newly saved track and select it
                          const newTrack = (updatedTracks || []).find(
                            (t: Track) => t.name === trackName && t.address === lastPlaceDetails.formatted_address
                          );
                          if (newTrack) {
                            setSelectedTrackId(newTrack.id);
                            setFormData(prev => ({
                              ...prev,
                              track: newTrack.name,
                              address: `${newTrack.address}${newTrack.city ? `, ${newTrack.city}` : ''}${newTrack.state ? `, ${newTrack.state}` : ''}`,
                            }));
                          }
                        } catch (err: any) {
                          console.error("Failed to save track:", err);
                        } finally {
                          setSavingTrack(false);
                        }
                      }}
                    >
                      <Star size={14} className="mr-1" />
                      {savingTrack ? "Saving..." : "Save as Track for future use"}
                    </Button>
                  )}
                </>
              ) : (
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Address will auto-fill when track is selected"
                  disabled={selectedTrackId !== "" && selectedTrackId !== "manual"}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock size={16} />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Car size={16} />
                Car/Vehicle
              </Label>
              <Select value={selectedCarId} onValueChange={handleCarSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a car..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="manual">Enter car manually</SelectItem>
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {getCarDisplayName(car)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedCarId === "manual" && (
                <Input
                  value={formData.car}
                  onChange={(e) => handleChange("car", e.target.value)}
                  placeholder="e.g., Track Beast - 2018 Mazda MX-5"
                  required
                />
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="pulse" className="flex-1">
                {editingEvent ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Same Day Event Confirmation Dialog */}
      <Dialog open={showSameDayConfirm} onOpenChange={setShowSameDayConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="text-primary" size={24} />
              Same-Day Event Confirmation
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-foreground">
              Your event starts at {formData.time}, which is past the typical session start time (8:00 AM). The preloaded session schedule will be cleared to avoid conflicts.
            </p>
            <p className="text-muted-foreground text-sm">
              After creating the event, use the Session Management page to add your custom schedule starting from {formData.time} onwards.
            </p>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => handleSameDayConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="pulse" onClick={() => handleSameDayConfirm(true)} className="flex-1">
                Clear Schedule & Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventForm;