import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Car, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCars } from "@/contexts/CarsContext";
import { Event } from "@/contexts/EventsContext";

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
  address: string;
  isSameDay?: boolean;
}

interface Track {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

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
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [carComboboxOpen, setCarComboboxOpen] = useState(false);
  const [showSameDayConfirm, setShowSameDayConfirm] = useState(false);

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
        const { data, error } = await supabase
          .from('tracks')
          .select('id, name, address, city, state')
          .order('name');
        
        if (error) {
          console.error('Error fetching tracks:', error);
        } else {
          setTracks(data || []);
        }
      } catch (error) {
        console.error('Error fetching tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    if (open) {
      fetchTracks();
    }
  }, [open]);

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
              <Select value={selectedTrackId} onValueChange={handleTrackSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingTracks ? "Loading tracks..." : "Select a track..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="manual">Enter track manually</SelectItem>
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.name} - {track.city}, {track.state}
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
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="e.g., 5250 Hwy 162, Willows, CA 95988"
                  required
                />
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