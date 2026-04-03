import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckSquare, ArrowLeft, ListChecks, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ChecklistCard from "@/components/ChecklistCard";
import Navigation from "@/components/Navigation";
import { useChecklists } from "@/contexts/ChecklistsContext";
import { useEvents } from "@/contexts/EventsContext";

const Checklists = () => {
  const navigate = useNavigate();
  const {
    templates, eventChecklists, loadingTemplates, loadingEventChecklists,
    addTemplate, deleteTemplate,
    addTemplateItem, updateTemplateItem, deleteTemplateItem, reorderTemplateItems,
    toggleChecklistItem, fetchAllEventChecklists,
  } = useChecklists();
  const { events } = useEvents();

  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<"event" | "trailer">("event");
  const [openEventIds, setOpenEventIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAllEventChecklists();
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    await addTemplate(newTemplateName.trim(), newTemplateType);
    setNewTemplateName("");
    setNewTemplateType("event");
    setIsNewTemplateOpen(false);
  };

  const toggleEventOpen = (eventId: string) => {
    setOpenEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  // Get events that have checklists
  const eventsWithChecklists = events.filter(e => eventChecklists[e.id]?.length > 0);

  return (
    <div className="min-h-screen bg-gradient-dark pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-3">
            <Button variant="glass" size="icon" className="size-8" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="text-primary" />
                Checklists
              </h1>
              <p className="text-muted-foreground text-sm">Templates & event checklists</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="templates" className="flex-1 gap-1.5">
              <ListChecks size={14} />
              Templates
            </TabsTrigger>
            <TabsTrigger value="by-event" className="flex-1 gap-1.5">
              <Calendar size={14} />
              By Event
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="pulse" size="sm" onClick={() => setIsNewTemplateOpen(true)}>
                <Plus size={16} />
                New Template
              </Button>
            </div>

            {loadingTemplates ? (
              <p className="text-muted-foreground text-center py-8">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <ListChecks size={48} className="mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">No templates yet</p>
                <p className="text-muted-foreground text-sm">Create a template to auto-generate checklists for new events.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map(template => (
                  <ChecklistCard
                    key={template.id}
                    id={template.id}
                    title={template.name}
                    type={template.type as "event" | "trailer"}
                    mode="template"
                    items={template.items}
                    onAddItem={(text) => addTemplateItem(template.id, text)}
                    onUpdateItem={updateTemplateItem}
                    onDeleteItem={deleteTemplateItem}
                    onReorderItems={(orderedIds) => reorderTemplateItems(template.id, orderedIds)}
                    onDelete={() => deleteTemplate(template.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* By Event Tab */}
          <TabsContent value="by-event" className="space-y-4">
            {loadingEventChecklists ? (
              <p className="text-muted-foreground text-center py-8">Loading checklists...</p>
            ) : eventsWithChecklists.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Calendar size={48} className="mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">No event checklists yet</p>
                <p className="text-muted-foreground text-sm">Create templates first, then add a new event to auto-generate checklists.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsWithChecklists.map(event => {
                  const checklists = eventChecklists[event.id] || [];
                  const allItems = checklists.flatMap(c => c.items);
                  const completed = allItems.filter(i => i.completed).length;
                  const total = allItems.length;
                  const isOpen = openEventIds.includes(event.id);

                  return (
                    <Collapsible key={event.id} open={isOpen} onOpenChange={() => toggleEventOpen(event.id)}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border cursor-pointer hover:border-primary/30 transition-colors">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{event.name}</p>
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                          </div>
                          <div className={`text-xs font-medium px-2 py-1 rounded-full ${completed === total ? 'bg-success/20 text-success' : 'bg-racing-orange/20 text-racing-orange'}`}>
                            ✓ {completed}/{total}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">
                        {checklists.map(cl => (
                          <ChecklistCard
                            key={cl.id}
                            id={cl.id}
                            title={cl.name}
                            type={cl.type as "event" | "trailer"}
                            mode="event"
                            items={cl.items}
                            onToggleItem={(itemId, completed) => toggleChecklistItem(itemId, completed)}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Template Dialog */}
      <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Template name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTemplate()}
              autoFocus
            />
            <Select value={newTemplateType} onValueChange={(v) => setNewTemplateType(v as "event" | "trailer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="pulse" className="w-full" onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
              Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Checklists;
