import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckSquare, ArrowLeft, ListChecks, Calendar, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    assignTemplateToEvent, addCustomChecklistToEvent, addEventChecklistItem,
    deleteEventChecklist, toggleChecklistItem, fetchAllEventChecklists,
  } = useChecklists();
  const { events } = useEvents();

  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<"event" | "trailer">("event");
  const [openEventIds, setOpenEventIds] = useState<string[]>([]);

  // Assign template dialog
  const [assignDialogEventId, setAssignDialogEventId] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<"template" | "custom">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<"event" | "trailer">("event");

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

  const handleAssign = async () => {
    if (!assignDialogEventId) return;
    if (assignMode === "template" && selectedTemplateId) {
      await assignTemplateToEvent(assignDialogEventId, selectedTemplateId);
    } else if (assignMode === "custom" && customName.trim()) {
      await addCustomChecklistToEvent(assignDialogEventId, customName.trim(), customType);
    }
    closeAssignDialog();
  };

  const closeAssignDialog = () => {
    setAssignDialogEventId(null);
    setSelectedTemplateId("");
    setCustomName("");
    setCustomType("event");
    setAssignMode("template");
  };

  // Sort events: upcoming first
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
                <p className="text-muted-foreground text-sm">Create a template to use as a blueprint for event checklists.</p>
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
            ) : sortedEvents.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Calendar size={48} className="mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">No events yet</p>
                <p className="text-muted-foreground text-sm">Create an event first, then assign checklists to it.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map(event => {
                  const checklists = eventChecklists[event.id] || [];
                  const allItems = checklists.flatMap(c => c.items);
                  const completed = allItems.filter(i => i.completed).length;
                  const total = allItems.length;
                  const isOpen = openEventIds.includes(event.id);

                  return (
                    <div key={event.id} className="rounded-lg border border-border overflow-hidden">
                      {/* Event header */}
                      <div
                        className="flex items-center justify-between p-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => toggleEventOpen(event.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                          <div>
                            <p className="font-semibold text-foreground text-sm">{event.name}</p>
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {total > 0 && (
                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${completed === total ? 'bg-success/20 text-success' : 'bg-racing-orange/20 text-racing-orange'}`}>
                              ✓ {completed}/{total}
                            </div>
                          )}
                          {checklists.length === 0 && (
                            <span className="text-xs text-muted-foreground">No checklists</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isOpen && (
                        <div className="p-3 space-y-3 border-t border-border">
                          {checklists.map(cl => (
                            <ChecklistCard
                              key={cl.id}
                              id={cl.id}
                              title={cl.name}
                              type={cl.type as "event" | "trailer"}
                              mode="event"
                              items={cl.items}
                              onToggleItem={(itemId, completed) => toggleChecklistItem(itemId, completed)}
                              onAddItem={(text) => addEventChecklistItem(cl.id, text)}
                              onDelete={() => deleteEventChecklist(cl.id)}
                            />
                          ))}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => { e.stopPropagation(); setAssignDialogEventId(event.id); }}
                          >
                            <Plus size={14} />
                            Add Checklist
                          </Button>
                        </div>
                      )}
                    </div>
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

      {/* Assign Checklist Dialog */}
      <Dialog open={!!assignDialogEventId} onOpenChange={(open) => { if (!open) closeAssignDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs value={assignMode} onValueChange={(v) => setAssignMode(v as "template" | "custom")}>
              <TabsList className="w-full">
                <TabsTrigger value="template" className="flex-1">From Template</TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-3 pt-2">
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No templates available. Create one in the Templates tab first.</p>
                ) : (
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="pulse"
                  className="w-full"
                  onClick={handleAssign}
                  disabled={!selectedTemplateId}
                >
                  Assign Template
                </Button>
              </TabsContent>

              <TabsContent value="custom" className="space-y-3 pt-2">
                <Input
                  placeholder="Checklist name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAssign()}
                  autoFocus
                />
                <Select value={customType} onValueChange={(v) => setCustomType(v as "event" | "trailer")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="pulse"
                  className="w-full"
                  onClick={handleAssign}
                  disabled={!customName.trim()}
                >
                  Create Checklist
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Checklists;
