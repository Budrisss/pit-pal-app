import { Wrench, Calendar, Save, Edit, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SetupData {
  frontTire: string;
  rearTire: string;
  frontPressure: string;
  rearPressure: string;
  suspension: string;
  gearing: string;
  notes: string;
}

interface SetupCardProps {
  id: string;
  eventName: string;
  trackName: string;
  date: string;
  carName?: string;
  setup: SetupData;
  isDefault?: boolean;
}

const SetupCard = ({ id, eventName, trackName, date, carName, setup, isDefault }: SetupCardProps) => {
  return (
    <Card className="bg-gradient-dark border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-racing">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Wrench size={20} className="text-primary" />
              {eventName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{trackName}</p>
          </div>
          {isDefault && (
            <Badge className="bg-racing-orange text-background">Default</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar size={14} />
          <span className="text-xs">{date}</span>
        </div>
        {carName && (
          <div className="flex items-center gap-2 text-racing-orange">
            <Car size={14} />
            <span className="text-xs">{carName}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Front Tire:</span>
            <p className="font-medium text-foreground">{setup.frontTire}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Rear Tire:</span>
            <p className="font-medium text-foreground">{setup.rearTire}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Front PSI:</span>
            <p className="font-medium text-racing-orange">{setup.frontPressure}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Rear PSI:</span>
            <p className="font-medium text-racing-orange">{setup.rearPressure}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Suspension:</span>
            <p className="font-medium text-foreground">{setup.suspension}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Gearing:</span>
            <p className="font-medium text-foreground">{setup.gearing}</p>
          </div>
          {setup.notes && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Notes:</span>
              <p className="font-medium text-foreground text-xs">{setup.notes}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="pulse" size="sm" className="flex-1">
            <Save size={16} />
            Copy Setup
          </Button>
          <Button variant="outline" size="sm">
            <Edit size={16} />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupCard;