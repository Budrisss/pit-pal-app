import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChecklistCard from "@/components/ChecklistCard";
import Navigation from "@/components/Navigation";

const Checklists = () => {
  const [checklists, setChecklists] = useState([
    {
      id: "1",
      title: "Pre-Track Day",
      type: "event" as const,
      eventDate: "Mar 15, 2024",
      items: [
        { id: "1", text: "Check tire pressure", completed: true },
        { id: "2", text: "Check brake fluid level", completed: true },
        { id: "3", text: "Inspect brake pads", completed: false },
        { id: "4", text: "Check oil level", completed: false },
        { id: "5", text: "Pack helmet and gear", completed: false },
        { id: "6", text: "Review track map", completed: true },
      ]
    },
    {
      id: "2", 
      title: "Trailer Prep",
      type: "trailer" as const,
      items: [
        { id: "7", text: "Check trailer tire pressure", completed: true },
        { id: "8", text: "Test trailer lights", completed: true },
        { id: "9", text: "Pack tie-down straps", completed: false },
        { id: "10", text: "Load spare tools", completed: false },
        { id: "11", text: "Check trailer hitch", completed: true },
        { id: "12", text: "Load emergency kit", completed: false },
      ]
    },
    {
      id: "3",
      title: "Post-Event",
      type: "event" as const,
      eventDate: "Mar 8, 2024", 
      items: [
        { id: "13", text: "Clean air filter", completed: true },
        { id: "14", text: "Check for loose bolts", completed: true },
        { id: "15", text: "Inspect tires for wear", completed: true },
        { id: "16", text: "Change engine oil", completed: false },
        { id: "17", text: "Review data logs", completed: false },
        { id: "18", text: "Update setup notes", completed: false },
      ]
    }
  ]);

  const toggleItem = (checklistId: string, itemId: string) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(checklist =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map(item =>
                item.id === itemId
                  ? { ...item, completed: !item.completed }
                  : item
              )
            }
          : checklist
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare className="text-primary" />
              Checklists
            </h1>
            <p className="text-muted-foreground text-sm">Stay organized for track events</p>
          </div>
          <Button variant="pulse" size="sm" onClick={() => console.log('New Checklist clicked')}>
            <Plus size={16} />
            New Checklist
          </Button>
        </div>

        {/* Checklist Cards */}
        <div className="space-y-4">
          {checklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              id={checklist.id}
              title={checklist.title}
              type={checklist.type}
              eventDate={checklist.eventDate}
              items={checklist.items}
              onToggleItem={(itemId) => toggleItem(checklist.id, itemId)}
            />
          ))}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Checklists;