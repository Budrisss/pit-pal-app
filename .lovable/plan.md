

## Plan: Remove My Registrations from Dashboard

### Rationale
The "My Registrations" card overlaps with the "Next Event" card and "Local Events" section, creating redundancy on the dashboard. Removing it simplifies the layout.

### Changes

**`src/pages/Dashboard.tsx`**
- Remove the `MyRegistrations` import (line 12)
- Remove the entire My Registrations motion block (lines 289–297)

This keeps the dashboard focused on Next Event, Garage, and Local Events — cleaner and less repetitive.

