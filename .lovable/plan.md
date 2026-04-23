

## Add "Download Maintenance Log" PDF Export

### What gets added
A **Download Log** button at the top of the Maintenance Log page (next to "Add Record") that generates a printable PDF of all maintenance records for the current vehicle, with a summary cover page.

### PDF structure

**Page 1 — Cover / Summary**
- Title: "Maintenance Log"
- Vehicle: `{Year} {Make} {Model}` + car name
- Generated on: today's date
- **Overall stats**:
  - Total records
  - Total spent (sum of all `cost`)
  - Date range (earliest → latest service date)
  - Latest mileage on file (if any)
- **Spend by year** table:
  ```
  Year    Records   Total Spent
  2025    8         $1,240.50
  2024    12        $2,830.00
  2023    5         $675.25
  ```
- **Spend by service type** table (top 10 by cost):
  ```
  Service Type     Count   Total
  Brake Pads       4       $890.00
  Oil Change       12      $540.00
  ...
  ```

**Page 2+ — Full log**
- Records listed newest-first (matches on-screen order)
- Each entry shows: date, service type, mileage, cost, notes, and a marker like `[2 attachments]` if any
- Smart page breaks: an entry won't split across pages
- Auto-fit font sizing (9–11pt) so common logs fit cleanly on letter pages
- Repeated header (vehicle name) and footer (`Page X of Y`) on every page

### Implementation

**New file: `src/lib/exportMaintenancePdf.ts`**
- Uses `jsPDF` (already in the project — used by `exportSetupPdf.ts` and `exportChecklistPdf.ts`)
- Exports `exportMaintenanceToPdf({ car, records })`
- Computes summary stats in-memory (group by year using `service_date`, group by `service_type`)
- Letter page size, 48pt margins, same layout conventions as the checklist exporter
- Filename: `maintenance-log-{car-name-slugified}-{YYYY-MM-DD}.pdf`

**Edit: `src/pages/MaintenanceLog.tsx`**
- Import `Download` icon from lucide-react
- Add a `Download Log` button in the header row next to "Add Record"
  - Disabled when `records.length === 0` (with title tooltip "No records to export")
  - On click: calls `exportMaintenanceToPdf({ car, records })`
- No change to the Add/Edit/Delete flows

### Out of scope
- Embedding attachment images/PDFs inside the export (would require fetching binaries + base64; could bloat file size significantly — possible follow-up)
- Per-year separate PDFs / date range filters
- CSV / Excel export
- Charts (bar/line of spend over time) — can add later if useful

