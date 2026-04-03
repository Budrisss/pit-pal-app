import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Car, Navigation as NavigationIcon, Thermometer, Wind, Eye, Edit, Trash2, Radio, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Navigation from "@/components/Navigation";
import DesktopNavigation from "@/components/DesktopNavigation";
import { useEvents } from "@/contexts/EventsContext";
import { useChecklists } from "@/contexts/ChecklistsContext";
import ChecklistCard from "@/components/ChecklistCard";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEventById, deleteEvent } = useEvents();
  const { eventChecklists, fetchEventChecklists, toggleChecklistItem } = useChecklists();

  useEffect(() => {
    if (id) fetchEventChecklists(id);
  }, [id]);

  // Find the specific event by ID
  const event = getEventById(id!);

  // If event not found, show error or redirect
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
        <DesktopNavigation />
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Event Not Found</h1>
          </div>
          <p className="text-muted-foreground">The requested event could not be found.</p>
        </div>
        <Navigation />
      </div>
    );
  }

  const getStatusColor = () => {
    switch (event.status) {
      case "upcoming": return "bg-racing-yellow text-background";
      case "completed": return "bg-success text-primary-foreground";
      default: return "bg-muted";
    }
  };

  const handleEdit = () => {
    navigate('/events', { state: { editingEvent: event } });
  };

  const handleDelete = async (cancelRegistration: boolean = false) => {
    await deleteEvent(id!, cancelRegistration);
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-gradient-dark pb-20 lg:pb-0 lg:pt-20">
      <DesktopNavigation />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              <Badge className={`${getStatusColor()} flex-shrink-0`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Event Details & Information</p>
          </div>
        </div>

        {/* Event Overview */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="text-primary" />
              Event Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">{event.description || `Track day event at ${event.track}. Get ready for an exciting day on the track!`}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={16} />
                <div>
                  <p className="font-medium text-foreground">{event.track}</p>
                  <p className="text-sm">{event.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Car size={16} />
                <div>
                  <p className="font-medium text-foreground">Vehicle</p>
                  <p className="text-sm">{event.car}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={16} />
                <div>
                  <p className="font-medium text-foreground">{event.date}</p>
                  <p className="text-sm">Event Date</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock size={16} />
                <div>
                  <p className="font-medium text-foreground">{event.time}</p>
                  <p className="text-sm">Start Time</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weather */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="text-primary" />
              Weather Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{event.weather?.temperature || "70°F"}</p>
                <p className="text-sm text-muted-foreground">Temperature</p>
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{event.weather?.condition || "Clear"}</p>
                <p className="text-sm text-muted-foreground">Conditions</p>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Wind size={16} />
                <div>
                  <p className="text-lg font-medium text-foreground">{event.weather?.windSpeed || "5 mph"}</p>
                  <p className="text-sm text-muted-foreground">Wind</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        {Array.isArray(event.schedule) && event.schedule.length > 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="text-primary" />
                Event Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.schedule.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                    <div className="text-sm font-medium text-primary min-w-[80px]">
                      {item.time}
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="text-sm text-foreground">
                      {item.activity}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requirements */}
        {Array.isArray(event.requirements) && event.requirements.length > 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NavigationIcon className="text-primary" />
                Requirements & What to Bring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {event.requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center gap-2 p-2">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="text-sm text-foreground">{requirement}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklists */}
        {(eventChecklists[id!] || []).length > 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="text-primary" />
                Checklists
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(eventChecklists[id!] || []).map(cl => (
                <ChecklistCard
                  key={cl.id}
                  id={cl.id}
                  title={cl.name}
                  type={cl.type as "event" | "trailer"}
                  mode="event"
                  items={cl.items}
                  onToggleItem={(itemId, completed) => toggleChecklistItem(itemId, completed)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" className="flex-1">
            <NavigationIcon size={16} />
            Get Directions
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleEdit}>
            <Edit size={16} />
            Edit Event
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Trash2 size={16} />
                Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  {event.publicEventId
                    ? `Are you sure you want to delete "${event.name}"? This event is linked to a registration.`
                    : `Are you sure you want to delete "${event.name}"? This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={event.publicEventId ? "flex-col sm:flex-row gap-2" : ""}>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {event.publicEventId ? (
                  <>
                    <AlertDialogAction onClick={() => handleDelete(false)} className="bg-muted text-foreground hover:bg-muted/80">
                      Delete Only
                    </AlertDialogAction>
                    <AlertDialogAction onClick={() => handleDelete(true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete & Cancel Registration
                    </AlertDialogAction>
                  </>
                ) : (
                  <AlertDialogAction onClick={() => handleDelete(false)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!event.publicEventId && (
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/driver-live/${event.id}`)}>
              <Radio size={16} />
              Go Live
            </Button>
          )}
          {event.publicEventId && (
            <Button variant="outline" className="flex-1">
              Start Event
            </Button>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default EventDetails;