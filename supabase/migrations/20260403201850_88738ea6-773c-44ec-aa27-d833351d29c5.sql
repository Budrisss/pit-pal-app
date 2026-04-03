
-- Checklist Templates
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'event',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist templates" ON public.checklist_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own checklist templates" ON public.checklist_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checklist templates" ON public.checklist_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checklist templates" ON public.checklist_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Checklist Template Items
CREATE TABLE public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template items" ON public.checklist_template_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own template items" ON public.checklist_template_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own template items" ON public.checklist_template_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own template items" ON public.checklist_template_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Event Checklists
CREATE TABLE public.event_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'event',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event checklists" ON public.event_checklists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own event checklists" ON public.event_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own event checklists" ON public.event_checklists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own event checklists" ON public.event_checklists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Event Checklist Items
CREATE TABLE public.event_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.event_checklists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.event_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event checklist items" ON public.event_checklist_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own event checklist items" ON public.event_checklist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own event checklist items" ON public.event_checklist_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own event checklist items" ON public.event_checklist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
