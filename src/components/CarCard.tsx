import { useState, useRef } from "react";
import { Calendar, Settings, Star, Car, Pencil, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CarCardProps {
  id: string;
  name: string;
  year: string;
  make: string;
  model: string;
  category: string;
  image: string;
  specs: {
    engine: string;
    power: string;
    weight: string;
    drivetrain: string;
  };
  events: number;
  setups: number;
  isDefault?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onImageUpload?: (id: string, file: File) => void;
}

const CarCard = ({ 
  id, 
  name, 
  year, 
  make, 
  model, 
  category, 
  image,
  events, 
  setups, 
  isDefault,
  onEdit,
  onDelete,
  onImageUpload
}: CarCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCategoryColor = () => {
    switch (category) {
      case "Track": return "bg-pulse-purple text-white";
      case "Street": return "bg-pulse-orange text-white";
      case "Street/Track": return "bg-gradient-pulse text-white";
      case "Race": return "bg-red-600 text-white";
      default: return "bg-muted";
    }
  };

  const hasImage = image && !image.includes("placeholder") && image.startsWith("http");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(id, file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Card className="bg-card border-border hover:shadow-pulse transition-all duration-300 rounded-xl lg:rounded-2xl h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="size-14 sm:size-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 relative overflow-hidden cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {hasImage ? (
                  <img src={image} alt={name} className="size-full object-cover" />
                ) : (
                  <Car size={20} className="sm:size-6 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={14} className="text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5 truncate">
                  <span className="truncate">{name}</span>
                  {isDefault && <Star size={14} className="sm:size-4 text-pulse-orange fill-pulse-orange flex-shrink-0" />}
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{year} {make} {model}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(id)}
                >
                  <Pencil size={14} />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
              <Badge className={`${getCategoryColor()} rounded-full px-2 sm:px-3 py-1 text-xs flex-shrink-0`}>
                {category}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-pulse-light rounded-xl border">
              <div className="text-lg sm:text-xl font-bold text-pulse-purple">{events}</div>
              <div className="text-xs text-muted-foreground font-medium">Events</div>
            </div>
            <div className="text-center p-3 bg-pulse-light rounded-xl border">
              <div className="text-lg sm:text-xl font-bold text-pulse-orange">{setups}</div>
              <div className="text-xs text-muted-foreground font-medium">Setups</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="flex-1 rounded-full border-2 hover:shadow-pulse text-xs sm:text-sm" onClick={() => console.log(`Events for car ${id}`)}>
              <Calendar size={14} className="sm:size-4" />
              <span className="ml-1 sm:ml-2">Events</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 rounded-full border-2 hover:shadow-pulse text-xs sm:text-sm" onClick={() => console.log(`Setups for car ${id}`)}>
              <Settings size={14} className="sm:size-4" />
              <span className="ml-1 sm:ml-2">Setups</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{year} {make} {model}</span> from your garage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.(id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CarCard;
