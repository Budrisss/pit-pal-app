import { useState } from "react";
import { CheckSquare, Square, List, Plus, Trash2, X, Edit2, Check, GripVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  onReorderItems?: (orderedIds: string[]) => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

interface SortableItemProps {
  item: ChecklistItem;
  mode: "template" | "event";
  editingItemId: string | null;
  editingText: string;
  setEditingText: (text: string) => void;
  onToggleItem?: (itemId: string, completed: boolean) => void;
  onDeleteItem?: (itemId: string) => void;
  onStartEdit: (item: ChecklistItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

const SortableItem = ({
  item, mode, editingItemId, editingText, setEditingText,
  onToggleItem, onDeleteItem, onStartEdit, onSaveEdit, onCancelEdit,
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors group"
    >
      {mode === "template" && (
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 text-muted-foreground hover:text-foreground">
          <GripVertical size={14} />
        </button>
      )}

      {mode === "event" && (
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
      )}

      {editingItemId === item.id ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSaveEdit}>
            <Check size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEdit}>
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onStartEdit(item)}>
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
  );
};

const ChecklistCard = ({ id, title, type, mode, items, onToggleItem, onAddItem, onDeleteItem, onUpdateItem, onReorderItems, onDelete, onDownload }: ChecklistCardProps) => {
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const newOrder = arrayMove(items, oldIndex, newIndex);
    onReorderItems?.(newOrder.map(i => i.id));
  };

  const itemsList = (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {items.map((item) => (
        <SortableItem
          key={item.id}
          item={item}
          mode={mode}
          editingItemId={editingItemId}
          editingText={editingText}
          setEditingText={setEditingText}
          onToggleItem={onToggleItem}
          onDeleteItem={onDeleteItem}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingItemId(null)}
        />
      ))}
    </div>
  );

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
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onDownload}
                title="Download checklist as PDF"
              >
                <Download size={14} />
              </Button>
            )}
            {onDelete && (
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

          {mode === "template" && items.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {itemsList}
              </SortableContext>
            </DndContext>
          ) : (
            itemsList
          )}

          {(mode === "template" || (mode === "event" && onAddItem)) && (
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
