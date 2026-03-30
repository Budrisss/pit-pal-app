
CREATE TABLE public.organizer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_profile_id uuid NOT NULL UNIQUE REFERENCES public.organizer_profiles(id) ON DELETE CASCADE,
  default_session_duration integer NOT NULL DEFAULT 20,
  default_reg_types text NOT NULL DEFAULT 'Beginner
Intermediate
Advanced',
  notif_new_registration boolean NOT NULL DEFAULT true,
  notif_cancel_registration boolean NOT NULL DEFAULT true,
  notif_session_reminder boolean NOT NULL DEFAULT true,
  notif_announcement_confirm boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own settings"
  ON public.organizer_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizer_profiles op
    WHERE op.id = organizer_settings.organizer_profile_id AND op.user_id = auth.uid()
  ));

CREATE POLICY "Organizers can insert own settings"
  ON public.organizer_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizer_profiles op
    WHERE op.id = organizer_settings.organizer_profile_id AND op.user_id = auth.uid()
  ));

CREATE POLICY "Organizers can update own settings"
  ON public.organizer_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizer_profiles op
    WHERE op.id = organizer_settings.organizer_profile_id AND op.user_id = auth.uid()
  ));
