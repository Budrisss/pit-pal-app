

## Maintenance Log Feature

### Overview
Add a per-vehicle maintenance log accessible via a new "Maintenance" button on each CarCard (alongside Events and Setups). Users can add service records with date, service type (from presets or custom), mileage, notes, and attach photos/PDFs. Records display in a simple chronological list (newest first).

### Database Changes

**New table: `maintenance_logs`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `car_id` (uuid, NOT NULL)
- `service_type` (text, NOT NULL) — e.g. "Oil Change", "Brake Pads", or custom text
- `service_date` (date, NOT NULL)
- `mileage` (integer, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())

RLS: standard user-owns-row pattern (SELECT/INSERT/UPDATE/DELETE where `auth.uid() = user_id`).

**New storage bucket: `maintenance-attachments`** (public)
- Path convention: `{user_id}/{log_id}/{filename}`

**New table: `maintenance_attachments`**
- `id` (uuid, PK)
- `log_id` (uuid, NOT NULL) — references maintenance_logs.id
- `user_id` (uuid, NOT NULL)
- `file_url` (text, NOT NULL)
- `file_name` (text, NOT NULL)
- `file_type` (text, nullable) — e.g. "image/jpeg", "application/pdf"
- `created_at` (timestamptz, default now())

RLS: same user-owns-row pattern.

### New Route & Page

**`/maintenance/:carId`** — new protected route.

**`src/pages/MaintenanceLog.tsx`**:
- Header shows car name (fetched from CarsContext)
- "Add Record" button opens a dialog/sheet with:
  - **Service Type**: Select with presets (Oil Change, Brake Pads, Brake Fluid, Tire Rotation, Alignment, Coolant Flush, Transmission Fluid, Spark Plugs, Air Filter, Belt Replacement, Custom) — selecting "Custom" shows a text input
  - **Date**: date picker (defaults to today)
  - **Mileage**: optional number input
  - **Notes**: optional textarea
  - **Attachments**: file upload (accept images + PDFs), multiple files allowed
- Chronological list of records showing service type badge, date, mileage, notes preview, and attachment thumbnails
- Tap a record to expand/view full details and attachments
- Swipe-to-delete pattern (consistent with CarCard)

### CarCard Update

Add a third action button "Maintenance" (Wrench icon) in `CarCard.tsx` alongside Events and Setups, navigating to `/maintenance/{carId}`.

### App.tsx Update

Add route: `<Route path="/maintenance/:carId" element={<ProtectedRoute><MaintenanceLog /></ProtectedRoute>} />`

### Preset Service Types
```
Oil Change, Brake Pads, Brake Fluid, Tire Rotation, Alignment,
Coolant Flush, Transmission Fluid, Spark Plugs, Air Filter,
Belt Replacement, Custom
```

### Technical Details

- File uploads use Supabase Storage (`maintenance-attachments` bucket)
- After inserting a log record, upload attachments to storage, get public URLs, then insert into `maintenance_attachments` table
- Display PDFs as a file icon with name; images as thumbnails
- Uses existing app patterns: CarsContext for car info, supabase client for data, toast for feedback
- Consistent styling with the rest of the app (glassmorphic scrollbars, card styles, etc.)

