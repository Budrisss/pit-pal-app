import { Calendar, Clock, MapPin, Timer, Car, Play, Edit, Trash2, MoreVertical, Eye, UserCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/contexts/EventsContext";

interface EventCardProps {
  id: string;
  name: string;
  track: string;
  date: string;
  time: string;
  countdown?: string;
  status: "upcoming" | "completed";
  car?: string;
  address?: string;
  isRegistered?: boolean;
  publicEventId?: string | null;
  onEdit?: () => void;
}

const EventCard = ({ id, name, track, date, time, countdown, status, car, address, isRegistered, publicEventId, onEdit }: EventCardProps) => {
  const navigate = useNavigate();
  const { deleteEvent } = useEvents();
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getBorderColor = () => {
    switch (status) {
      case "upcoming": return "border-l-racing-yellow";
      case "completed": return "border-l-success";
      default: return "border-l-muted";
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

  const handleDelete = (cancelRegistration: boolean = false) => {
    deleteEvent(id, cancelRegistration);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className={`bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-racing h-full border-l-4 ${getBorderColor()}`}>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Header: Title + Menu */}
          <div className="flex items-start gap-2">
            <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-2 flex-1">{name}</h3>
            {isRegistered && (
              <Badge variant="secondary" className="shrink-0 text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
                <UserCheck size={10} />
                Registered
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit size={14} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="text-sm truncate" title={track}>{track}</span>
            </div>
            {car && (
              <div className="flex items-center gap-2 text-racing-orange">
                <Car size={14} className="flex-shrink-0" />
                <span className="text-sm truncate" title={car}>{car}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {date}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {time}
              </span>
            </div>
          </div>

          {/* Countdown */}
          {countdown && status === "upcoming" && (
            <div className="flex items-center gap-2 text-racing-orange bg-racing-orange/10 p-2 rounded-lg">
              <Timer size={14} />
              <span className="text-sm font-medium">{countdown}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="pulse" size="sm" className="flex-1" onClick={() => navigate(`/events/${id}`)}>
              <Eye size={14} />
              Details
            </Button>
            {status === "upcoming" && (
              <Button variant="orange" size="sm" className="flex-1" onClick={handleStartEvent}>
                <Play size={14} />
                Start
              </Button>
            )}
            {status === "completed" && (
              <Button variant="pulse" size="sm" className="flex-1" onClick={() => navigate(`/session-management/${id}`)}>
                <Play size={14} />
                Review
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
    </>
  );
};

export default EventCard;
