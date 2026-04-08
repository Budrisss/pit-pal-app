import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Star, Clock } from "lucide-react";

interface StampCardProps {
  trackName: string;
  date: string;
  groupLevel?: string | null;
  hours: number;
  rating?: number | null;
  comments?: string | null;
}

const StampCard = ({ trackName, date, groupLevel, hours, rating, comments }: StampCardProps) => {
  return (
    <Card className="border border-border/60 bg-card/70">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">{trackName}</span>
          </div>
          {groupLevel && (
            <Badge variant="outline" className="text-xs shrink-0">
              {groupLevel}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(date).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {hours} hr{hours !== 1 ? "s" : ""}
          </span>
        </div>

        {rating && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${i < rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}

        {comments && (
          <p className="text-xs text-muted-foreground italic">"{comments}"</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StampCard;
