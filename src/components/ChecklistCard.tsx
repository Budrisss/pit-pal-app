import { CheckSquare, Square, Calendar, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistCardProps {
  id: string;
  title: string;
  type: "event" | "trailer";
  eventDate?: string;
  items: ChecklistItem[];
  onToggleItem: (itemId: string) => void;
}

const ChecklistCard = ({ id, title, type, eventDate, items, onToggleItem }: ChecklistCardProps) => {
  const completedItems = items.filter(item => item.completed).length;
  const progressPercentage = (completedItems / items.length) * 100;

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-racing">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <List size={20} className="text-primary" />
              {title}
            </CardTitle>
            {eventDate && (
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar size={14} />
                <span className="text-xs">{eventDate}</span>
              </div>
            )}
          </div>
          <Badge className={type === "event" ? "bg-racing-red text-primary-foreground" : "bg-racing-orange text-background"}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">{completedItems}/{items.length}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => onToggleItem(item.id)}
              >
                {item.completed ? (
                  <CheckSquare size={18} className="text-success" />
                ) : (
                  <Square size={18} className="text-muted-foreground" />
                )}
                <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          <Button variant="pulse" size="sm" className="w-full">
            Edit Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChecklistCard;