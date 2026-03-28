import { Calendar, Settings, Star, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

const CarCard = ({ 
  id, 
  name, 
  year, 
  make, 
  model, 
  category, 
  events, 
  setups, 
  isDefault 
}: CarCardProps) => {
  const getCategoryColor = () => {
    switch (category) {
      case "Track": return "bg-pulse-purple text-white";
      case "Street": return "bg-pulse-orange text-white";
      case "Street/Track": return "bg-gradient-pulse text-white";
      case "Race": return "bg-red-600 text-white";
      default: return "bg-muted";
    }
  };

  return (
    <Card className="bg-card border-border hover:shadow-pulse transition-all duration-300 rounded-xl lg:rounded-2xl h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="size-10 sm:size-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Car size={20} className="sm:size-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5 truncate">
                <span className="truncate">{name}</span>
                {isDefault && <Star size={14} className="sm:size-4 text-pulse-orange fill-pulse-orange flex-shrink-0" />}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{year} {make} {model}</p>
            </div>
          </div>
          <Badge className={`${getCategoryColor()} rounded-full px-2 sm:px-3 py-1 text-xs flex-shrink-0`}>
            {category}
          </Badge>
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
  );
};

export default CarCard;
