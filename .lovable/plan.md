

## Expand Chassis Setup Form: Toe, Caster, Tire Pressures & Wear Photos

### What gets added to the Chassis Setup Form

Under **Suspension Settings**:
- **Toe (degrees)** — LF / RF / LR / RR (positive = toe-in, negative = toe-out)
- **Caster (degrees)** — LF / RF only (rear caster isn't a thing on most cars)

Under a new **Tire Pressures** section:
- **Cold Pressure (psi)** — LF / RF / LR / RR
- **Hot Pressure (psi)** — LF / RF / LR / RR

Under a new **Tire Wear Photos** section:
- One upload slot per corner: **LF, RF, LR, RR**
- Each slot lets you upload an image (camera capture supported on mobile), shows a thumbnail, click to preview full-size, X to remove
- Multiple photos per corner allowed (e.g., before/after a session)

### Database changes

**New columns on `setup_data`** (all `numeric NULL`):
- `lf_toe`, `rf_toe`, `lr_toe`, `rr_toe`
- `lf_caster`, `rf_caster`

(Cold/hot pressure columns already exist on `setup_data` — no migration needed there.)

**New table `setup_tire_photos`** for per-corner wear photos:
| column | type |
|---|---|
| id | uuid PK |
| setup_id | uuid (nullable, like setup_attachments) |
| user_id | uuid |
| corner | text — `'LF' \| 'RF' \| 'LR' \| 'RR'` (CHECK constraint) |
| file_name | text |
| file_url | text (storage path) |
| file_type | text |
| created_at | timestamptz default now() |

RLS: standard `auth.uid() = user_id` for select/insert/update/delete.

Files go in the existing **`setup-attachments`** private bucket under `${user_id}/tire-wear/${setup_id_or_unlinked}/${corner}-${timestamp}.jpg`. No new bucket needed.

### Files to create / update

- **Update** `src/components/VehicleSetupForm.tsx`
  - Add Toe (4) and Caster (2) inputs to Suspension Settings section
  - Add new "Tire Pressures" section with Cold + Hot pressure grids (4 corners each)
  - Wire new fields into `SetupFormData` and the insert payload
  - Add new "Tire Wear Photos" section using the new component below
- **Create** `src/components/TireWearPhotos.tsx`
  - Props: `setupId | null`, `userId`, `photos`, `onChanged`
  - Renders a 2×2 corner grid (LF/RF on top, LR/RR on bottom) — each cell has thumbnails + an "Add photo" button (`<input type="file" accept="image/*" capture="environment">`)
  - Click thumbnail → full-size preview dialog (reuses the same pattern as `SetupAttachments`)
  - X button removes the photo from storage + DB
- **Update** `src/pages/Setups.tsx`
  - On the "New Setup Sheet" card, add a Tire Wear Photos block (corner grid) the same way it currently shows generic attachments — uploads while `setup_id` is null get linked to the new setup on save
  - Saved-setup expanded view: show tire wear photos per corner alongside the existing attachments
  - Fetch tire photos alongside `fetchAttachments` and pass them down
- **Migration**: add new columns + create `setup_tire_photos` table with RLS policies

### Out of scope (can add later)
- Tire temp grid in this form (already exists in DB columns; can add as separate "Tire Temperatures" section in a follow-up)
- Toe-in vs toe-out unit toggle (inches vs degrees)
- Side-by-side wear photo comparison across sessions

