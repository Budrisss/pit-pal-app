import { Car, Calendar, Settings, Star } from "lucide-react";
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
  image, 
  specs, 
  events, 
  setups, 
  isDefault 
}: CarCardProps) => {
  const getCategoryColor = () => {
    switch (category) {
      case "Track": return "bg-pulse-purple text-white";
      case "Street": return "bg-pulse-orange text-white";
      case "Street/Track": return "bg-gradient-pulse text-white";
      default: return "bg-muted";
    }
  };

  return (
    <Card className="bg-card border-border hover:shadow-pulse transition-all duration-300 rounded-xl lg:rounded-2xl h-full">
      <CardHeader className="pb-3 lg:pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-foreground flex items-center gap-2 truncate">
              <span className="truncate">{name}</span>
              {isDefault && <Star size={14} className="sm:size-4 lg:size-5 text-pulse-orange fill-pulse-orange flex-shrink-0" />}
            </CardTitle>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground truncate">{year} {make} {model}</p>
          </div>
          <Badge className={`${getCategoryColor()} rounded-full px-2 sm:px-3 py-1 text-xs lg:text-sm flex-shrink-0`}>
            {category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 lg:space-y-4">

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="min-w-0">
            <span className="text-muted-foreground">Engine:</span>
            <p className="text-foreground font-medium truncate" title={specs.engine}>{specs.engine}</p>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Power:</span>
            <p className="text-foreground font-medium truncate" title={specs.power}>{specs.power}</p>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Weight:</span>
            <p className="text-foreground font-medium truncate" title={specs.weight}>{specs.weight}</p>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Drive:</span>
            <p className="text-foreground font-medium truncate" title={specs.drivetrain}>{specs.drivetrain}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center p-3 sm:p-4 bg-pulse-light rounded-xl lg:rounded-2xl border">
          <div className="text-center">
            <div className="text-base sm:text-lg lg:text-xl font-bold text-pulse-purple">{events}</div>
            <div className="text-xs lg:text-sm text-muted-foreground font-medium">Events</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-lg lg:text-xl font-bold text-pulse-orange">{setups}</div>
            <div className="text-xs lg:text-sm text-muted-foreground font-medium">Setups</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="pulse" size="sm" className="flex-1 rounded-full text-xs sm:text-sm" onClick={() => console.log(`Events for car ${id}`)}>
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