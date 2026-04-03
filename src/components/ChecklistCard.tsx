import { useState } from "react";
import { CheckSquare, Square, Calendar, List, Plus, Trash2, X, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  sort_order: number;
}

interface ChecklistCardProps {
  id: string;
  title: string;
  type: "event" | "trailer";
  mode: "template" | "event";
  items: ChecklistItem[];
  onToggleItem?: (itemId: string, completed: boolean) => void;
  onAddItem?: (text: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onUpdateItem?: (itemId: string, text: string) => void;
  onDelete?: () => void;
}

const ChecklistCard = ({ id, title, type, mode, items, onToggleItem, onAddItem, onDeleteItem, onUpdateItem, onDelete }: ChecklistCardProps) => {
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const completedItems = items.filter(item => item.completed).length;
  const progressPercentage = items.length > 0 ? (completedItems / items.length) * 100 : 0;

  const handleAddItem = () => {
    if (newItemText.trim() && onAddItem) {
      onAddItem(newItemText.trim());
      setNewItemText("");
    }
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = () => {
    if (editingItemId && editingText.trim() && onUpdateItem) {
      onUpdateItem(editingItemId, editingText.trim());
    }
    setEditingItemId(null);
    setEditingText("");
  };

  return (
    <Card className="bg-muted/40 border-border hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <List size={20} className="text-primary" />
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={type === "event" ? "bg-racing-red text-primary-foreground" : "bg-racing-orange text-background"}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
            {mode === "template" && onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mode === "event" && items.length > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{completedItems}/{items.length}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors group"
              >
                {mode === "event" ? (
                  <div
                    className="cursor-pointer flex-shrink-0"
                    onClick={() => onToggleItem?.(item.id, !item.completed)}
                  >
                    {item.completed ? (
                      <CheckSquare size={18} className="text-success" />
                    ) : (
                      <Square size={18} className="text-muted-foreground" />
                    )}
                  </div>
                ) : null}

                {editingItemId === item.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="h-7 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                      <Check size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItemId(null)}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={`text-sm flex-1 ${mode === "event" && item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.text}
                    </span>
                    {mode === "template" && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleStartEdit(item)}>
                          <Edit2 size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDeleteItem?.(item.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {mode === "template" && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add item..."
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                className="h-8 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleAddItem} disabled={!newItemText.trim()}>
                <Plus size={16} />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChecklistCard;
