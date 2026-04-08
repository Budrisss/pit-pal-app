

## GridID — Digital Racer Passport

### Overview
Add a "GridID" feature: a digital credential card showing verified track hours, a QR code linking to a public safety manifest, and an organizer stamp system. Integrates with existing tables and navigation.

### Database Changes (3 migrations)

**Migration 1 — `racer_profiles` table**
```sql
CREATE TABLE public.racer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text NOT NULL DEFAULT '',
  total_track_hours numeric NOT NULL DEFAULT 0,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.racer_profiles ENABLE ROW LEVEL SECURITY;
-- Owner can CRUD own profile
CREATE POLICY "Users can view own racer profile" ON public.racer_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own racer profile" ON public.racer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own racer profile" ON public.racer_profiles FOR UPDATE USING (auth.uid() = user_id);
-- Public read for the safety manifest (limited columns via app logic)
CREATE POLICY "Anyone can view racer profiles" ON public.racer_profiles FOR SELECT TO authenticated USING (true);
```

**Migration 2 — `grid_stamps` table**
```sql
CREATE TABLE public.grid_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id uuid NOT NULL,
  organizer_id uuid NOT NULL,
  track_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  group_level text,
  hours numeric NOT NULL DEFAULT 1,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grid_stamps ENABLE ROW LEVEL SECURITY;
-- Racers can view their own stamps
CREATE POLICY "Racers can view own stamps" ON public.grid_stamps FOR SELECT TO authenticated USING (racer_id = auth.uid());
-- Approved organizers can insert stamps
CREATE POLICY "Organizers can insert stamps" ON public.grid_stamps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM organizer_profiles op WHERE op.user_id = auth.uid() AND op.approved = true AND op.id = grid_stamps.organizer_id));
-- Anyone authenticated can view stamps (for public manifest)
CREATE POLICY "Authenticated can view stamps" ON public.grid_stamps FOR SELECT TO authenticated USING (true);
```

**Migration 3 — Auto-increment trigger**
```sql
CREATE OR REPLACE FUNCTION public.increment_track_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.racer_profiles (user_id, total_track_hours)
  VALUES (NEW.racer_id, NEW.hours)
  ON CONFLICT (user_id)
  DO UPDATE SET total_track_hours = racer_profiles.total_track_hours + NEW.hours,
               updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_track_hours
  AFTER INSERT ON public.grid_stamps
  FOR EACH ROW EXECUTE FUNCTION public.increment_track_hours();
```

### New Files

**1. `src/pages/GridID.tsx`** — Main passport page
- Fetches/creates the user's `racer_profiles` row on mount
- Displays a "Passport Card" component with: display name, total verified track hours, car count, a generated QR code (using `qrcode.react` library) linking to `/grid-manifest/{userId}`
- Below the card: a chronological list of `grid_stamps` with track name, date, group, rating stars, and organizer comments
- Uses existing `Navigation`, `DesktopNavigation`, `Card`, `Badge`, `Button` components
- Matches Dashboard styling: motion animations, `bg-card/70`, `border-primary/20`, same spacing

**2. `src/pages/GridManifest.tsx`** — Public read-only safety manifest
- Route: `/grid-manifest/:userId`
- NOT wrapped in `ProtectedRoute` — accessible to any authenticated user (organizers scan QR)
- Displays racer name, total hours, car list (from `cars` table), maintenance history summary, and stamp history
- Clean, read-only card layout

**3. `src/components/GridPassportCard.tsx`** — Reusable passport card component
- Professional credential-style card with gradient border accent
- QR code rendered via `qrcode.react`
- Shows name, hours badge, member-since date

**4. `src/components/StampCard.tsx`** — Individual stamp display
- Shows track name, date, group level, star rating, organizer comments
- Styled like existing EventCard pattern

**5. `src/pages/OrganizerStampPortal.tsx`** — Stamp submission (organizer mode only)
- Search by user email to find a racer's GridID
- Form: track name, date, group level, hours, rating (1-5), comments
- Submits to `grid_stamps` table (trigger auto-updates hours)
- Only accessible when `isOrganizerMode && isApproved`

### Modified Files

**`src/App.tsx`** — Add 3 routes:
- `/grid-id` → `<ProtectedRoute><GridID /></ProtectedRoute>`
- `/grid-manifest/:userId` → `<ProtectedRoute><GridManifest /></ProtectedRoute>`
- `/organizer-stamp` → `<ProtectedRoute><OrganizerStampPortal /></ProtectedRoute>`

**`src/components/Navigation.tsx`** — Add GridID nav item to `userNavItems`:
```ts
{ icon: IdCard, label: "GridID", path: "/grid-id" }
```

**`src/components/DesktopNavigation.tsx`** — Same addition to desktop nav. Add stamp portal to `organizerNavItems`:
```ts
{ icon: Stamp, label: "Stamps", path: "/organizer-stamp" }
```

**`package.json`** — Add dependency: `qrcode.react`

### Implementation Order
1. Database migrations (3)
2. Install `qrcode.react`
3. Create `GridPassportCard` and `StampCard` components
4. Create `GridID` page
5. Create `GridManifest` page
6. Create `OrganizerStampPortal` page
7. Update `App.tsx` routes
8. Update both navigation components

