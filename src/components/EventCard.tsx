import { Calendar, Clock, MapPin, Timer, Car, Play, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEvents } from "@/contexts/EventsContext";

interface EventCardProps {
  id: string;
  name: string;
  track: string;
  date: string;
  time: string;
  countdown?: string;
  status: "upcoming" | "active" | "completed";
  car?: string;
  address?: string;
  onEdit?: () => void;
}

const EventCard = ({ id, name, track, date, time, countdown, status, car, address, onEdit }: EventCardProps) => {
  const navigate = useNavigate();
  const { deleteEvent } = useEvents();
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case "upcoming": return "bg-racing-yellow text-background";
      case "active": return "bg-racing-red text-primary-foreground";
      case "completed": return "bg-success text-primary-foreground";
      default: return "bg-muted";
    }
  };

  const handleStartEvent = () => {
    setIsChecklistDialogOpen(true);
  };

  const handleChecklistConfirm = (confirmed: boolean) => {
    setIsChecklistDialogOpen(false);
    if (confirmed) {
      navigate(`/session-management/${id}`);
    }
  };

  const handleDelete = () => {
    deleteEvent(id);
  };

  return (
    <Card className="bg-gradient-dark border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-racing h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-foreground line-clamp-2">{name}</CardTitle>
          <Badge className={`${getStatusColor()} flex-shrink-0 text-xs lg:text-sm`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 lg:space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin size={14} className="sm:size-4 lg:size-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm lg:text-base truncate" title={track}>{track}</span>
        </div>

        {car && (
          <div className="flex items-center gap-2 text-racing-orange">
            <Car size={14} className="sm:size-4 lg:size-5 flex-shrink-0" />
            <span className="text-xs sm:text-sm lg:text-base truncate" title={car}>{car}</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar size={14} className="sm:size-4 lg:size-5" />
            <span className="text-xs sm:text-sm lg:text-base">{date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={14} className="sm:size-4 lg:size-5" />
            <span className="text-xs sm:text-sm lg:text-base">{time}</span>
          </div>
        </div>

        {countdown && status === "upcoming" && (
          <div className="flex items-center gap-2 text-racing-orange bg-racing-orange/10 p-2 rounded-lg">
            <Timer size={14} className="sm:size-4 lg:size-5" />
            <span className="text-xs sm:text-sm lg:text-base font-medium">{countdown}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-2 pt-2">
          <Button variant="pulse" size="default" className="flex-1 text-sm px-2 py-2" onClick={() => navigate(`/events/${id}`)}>
            <span className="hidden lg:inline">View </span>Details
          </Button>
          <Button variant="outline" size="default" className="flex-1 text-sm px-2 py-2" onClick={onEdit}>
            <Edit size={14} />
            <span className="ml-1 hidden lg:inline">Edit</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="default" className="flex-1 text-sm px-2 py-2">
                <Trash2 size={14} />
                <span className="ml-1 hidden lg:inline">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {status === "upcoming" && (
            <Button variant="orange" size="default" className="flex-1 text-sm px-2 py-2" onClick={handleStartEvent}>
              <Play size={14} />
              <span className="ml-1">Start</span>
            </Button>
          )}
          {status === "completed" && (
            <Button variant="pulse" size="default" className="flex-1 text-sm px-2 py-2" onClick={() => navigate(`/session-management/${id}`)}>
              <Play size={14} />
              <span className="ml-1">Review</span>
            </Button>
          )}
        </div>
      </CardContent>
      
      {/* Checklist Confirmation Dialog */}
      <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play size={24} className="text-primary" />
              Start Event - {name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-foreground">Have all checklists been completed prior to starting this event?</p>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => handleChecklistConfirm(false)} className="flex-1">
                No
              </Button>
              <Button variant="pulse" onClick={() => handleChecklistConfirm(true)} className="flex-1">
                Yes, Start Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventCard;