import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChecklistTemplate {
  id: string;
  name: string;
  type: "event" | "trailer";
  sort_order: number;
  items: ChecklistTemplateItem[];
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  text: string;
  sort_order: number;
}

export interface EventChecklist {
  id: string;
  event_id: string;
  template_id: string | null;
  name: string;
  type: string;
  items: EventChecklistItem[];
}

export interface EventChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  completed: boolean;
  sort_order: number;
}

export interface EventChecklistProgress {
  total: number;
  completed: number;
}

interface ChecklistsContextType {
  templates: ChecklistTemplate[];
  eventChecklists: Record<string, EventChecklist[]>;
  loadingTemplates: boolean;
  loadingEventChecklists: boolean;
  // Templates
  addTemplate: (name: string, type: "event" | "trailer") => Promise<string | null>;
  updateTemplate: (id: string, name: string, type: "event" | "trailer") => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addTemplateItem: (templateId: string, text: string) => Promise<void>;
  updateTemplateItem: (itemId: string, text: string) => Promise<void>;
  deleteTemplateItem: (itemId: string) => Promise<void>;
  // Event checklists
  generateChecklistsForEvent: (eventId: string) => Promise<void>;
  fetchEventChecklists: (eventId: string) => Promise<void>;
  toggleChecklistItem: (itemId: string, completed: boolean) => Promise<void>;
  getEventProgress: (eventId: string) => EventChecklistProgress;
  fetchAllEventChecklists: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

const ChecklistsContext = createContext<ChecklistsContextType | undefined>(undefined);

export const ChecklistsProvider = ({ children }: { children: ReactNode }) => {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [eventChecklists, setEventChecklists] = useState<Record<string, EventChecklist[]>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingEventChecklists, setLoadingEventChecklists] = useState(false);
  const { user } = useAuth();

  const fetchTemplates = useCallback(async () => {
    if (!user) { setTemplates([]); setLoadingTemplates(false); return; }
    setLoadingTemplates(true);

    const { data: tData } = await (supabase as any)
      .from("checklist_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order");

    if (!tData) { setLoadingTemplates(false); return; }

    const templateIds = tData.map((t: any) => t.id);
    let itemsMap: Record<string, ChecklistTemplateItem[]> = {};

    if (templateIds.length > 0) {
      const { data: iData } = await (supabase as any)
        .from("checklist_template_items")
        .select("*")
        .in("template_id", templateIds)
        .order("sort_order");

      if (iData) {
        for (const item of iData) {
          if (!itemsMap[item.template_id]) itemsMap[item.template_id] = [];
          itemsMap[item.template_id].push(item);
        }
      }
    }

    setTemplates(tData.map((t: any) => ({
      ...t,
      items: itemsMap[t.id] || [],
    })));
    setLoadingTemplates(false);
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addTemplate = async (name: string, type: "event" | "trailer"): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await (supabase as any)
      .from("checklist_templates")
      .insert({ user_id: user.id, name, type, sort_order: templates.length })
      .select("id")
      .single();
    if (!error && data) {
      await fetchTemplates();
      return data.id;
    }
    return null;
  };

  const updateTemplate = async (id: string, name: string, type: "event" | "trailer") => {
    if (!user) return;
    await (supabase as any).from("checklist_templates").update({ name, type }).eq("id", id).eq("user_id", user.id);
    await fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!user) return;
    await (supabase as any).from("checklist_templates").delete().eq("id", id).eq("user_id", user.id);
    await fetchTemplates();
  };

  const addTemplateItem = async (templateId: string, text: string) => {
    if (!user) return;
    const template = templates.find(t => t.id === templateId);
    const sortOrder = template ? template.items.length : 0;
    await (supabase as any).from("checklist_template_items").insert({
      template_id: templateId,
      user_id: user.id,
      text,
      sort_order: sortOrder,
    });
    await fetchTemplates();
  };

  const updateTemplateItem = async (itemId: string, text: string) => {
    if (!user) return;
    await (supabase as any).from("checklist_template_items").update({ text }).eq("id", itemId).eq("user_id", user.id);
    await fetchTemplates();
  };

  const deleteTemplateItem = async (itemId: string) => {
    if (!user) return;
    await (supabase as any).from("checklist_template_items").delete().eq("id", itemId).eq("user_id", user.id);
    await fetchTemplates();
  };

  const generateChecklistsForEvent = async (eventId: string) => {
    if (!user || templates.length === 0) return;

    for (const template of templates) {
      const { data: checklist } = await (supabase as any)
        .from("event_checklists")
        .insert({
          event_id: eventId,
          user_id: user.id,
          template_id: template.id,
          name: template.name,
          type: template.type,
        })
        .select("id")
        .single();

      if (checklist && template.items.length > 0) {
        const items = template.items.map((item, idx) => ({
          checklist_id: checklist.id,
          user_id: user.id,
          text: item.text,
          completed: false,
          sort_order: idx,
        }));
        await (supabase as any).from("event_checklist_items").insert(items);
      }
    }
  };

  const fetchEventChecklists = async (eventId: string) => {
    if (!user) return;

    const { data: clData } = await (supabase as any)
      .from("event_checklists")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (!clData || clData.length === 0) {
      setEventChecklists(prev => ({ ...prev, [eventId]: [] }));
      return;
    }

    const checklistIds = clData.map((c: any) => c.id);
    const { data: itemData } = await (supabase as any)
      .from("event_checklist_items")
      .select("*")
      .in("checklist_id", checklistIds)
      .order("sort_order");

    const itemsMap: Record<string, EventChecklistItem[]> = {};
    if (itemData) {
      for (const item of itemData) {
        if (!itemsMap[item.checklist_id]) itemsMap[item.checklist_id] = [];
        itemsMap[item.checklist_id].push(item);
      }
    }

    const checklists: EventChecklist[] = clData.map((c: any) => ({
      ...c,
      items: itemsMap[c.id] || [],
    }));

    setEventChecklists(prev => ({ ...prev, [eventId]: checklists }));
  };

  const fetchAllEventChecklists = async () => {
    if (!user) return;
    setLoadingEventChecklists(true);

    const { data: clData } = await (supabase as any)
      .from("event_checklists")
      .select("*")
      .eq("user_id", user.id);

    if (!clData || clData.length === 0) {
      setEventChecklists({});
      setLoadingEventChecklists(false);
      return;
    }

    const checklistIds = clData.map((c: any) => c.id);
    const { data: itemData } = await (supabase as any)
      .from("event_checklist_items")
      .select("*")
      .in("checklist_id", checklistIds)
      .order("sort_order");

    const itemsMap: Record<string, EventChecklistItem[]> = {};
    if (itemData) {
      for (const item of itemData) {
        if (!itemsMap[item.checklist_id]) itemsMap[item.checklist_id] = [];
        itemsMap[item.checklist_id].push(item);
      }
    }

    const grouped: Record<string, EventChecklist[]> = {};
    for (const c of clData) {
      if (!grouped[c.event_id]) grouped[c.event_id] = [];
      grouped[c.event_id].push({ ...c, items: itemsMap[c.id] || [] });
    }

    setEventChecklists(grouped);
    setLoadingEventChecklists(false);
  };

  const toggleChecklistItem = async (itemId: string, completed: boolean) => {
    if (!user) return;
    await (supabase as any)
      .from("event_checklist_items")
      .update({ completed })
      .eq("id", itemId)
      .eq("user_id", user.id);

    // Optimistic update
    setEventChecklists(prev => {
      const next = { ...prev };
      for (const eventId of Object.keys(next)) {
        next[eventId] = next[eventId].map(cl => ({
          ...cl,
          items: cl.items.map(item =>
            item.id === itemId ? { ...item, completed } : item
          ),
        }));
      }
      return next;
    });
  };

  const getEventProgress = (eventId: string): EventChecklistProgress => {
    const checklists = eventChecklists[eventId];
    if (!checklists || checklists.length === 0) return { total: 0, completed: 0 };
    const allItems = checklists.flatMap(c => c.items);
    return {
      total: allItems.length,
      completed: allItems.filter(i => i.completed).length,
    };
  };

  return (
    <ChecklistsContext.Provider value={{
      templates,
      eventChecklists,
      loadingTemplates,
      loadingEventChecklists,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      addTemplateItem,
      updateTemplateItem,
      deleteTemplateItem,
      generateChecklistsForEvent,
      fetchEventChecklists,
      toggleChecklistItem,
      getEventProgress,
      fetchAllEventChecklists,
      refreshTemplates: fetchTemplates,
    }}>
      {children}
    </ChecklistsContext.Provider>
  );
};

export const useChecklists = () => {
  const context = useContext(ChecklistsContext);
  if (!context) throw new Error("useChecklists must be used within ChecklistsProvider");
  return context;
};
