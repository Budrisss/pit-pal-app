

Looking at OrganizerLiveManage — it already joins paired devices per registration (status dot + node id). User wants a dedicated **Paired Radios panel** grouped by run group, showing driver / car / number / node id, so race control can scan radio coverage at a glance per group.

## Plan

### New section in `OrganizerLiveManage`: "Paired Radios by Run Group"

Placed above (or as a tab next to) the existing participants table. Uses data already fetched — no new queries needed since registrations + paired devices are already joined.

**Layout per run group:**

```text
┌─ Run Group A ─────────── 12/30 on radio ─┐
│  #42  John Smith    Civic Type R    🟢 !a3b1c9d8   2m ago │
│  #17  Jane Doe      Miata           🟡 !b8d4e2f1   18m ago│
│  #08  Mike Chen     M3              ⚫ no radio            │
└──────────────────────────────────────────┘
```

- Group header: name + "X/Y on radio" count + collapsible chevron
- Row per registration in that group (sorted by car number)
- Columns: car# · driver name · car (year/make/model from `cars` join — already fetched) · node status dot · node id (mono) · last_seen relative time
- Unassigned (no run group) bucket at the bottom
- Empty state: "No radios paired yet for this event"

### Status logic (already partially in place)
- 🟢 paired + last_seen ≤ 10 min
- 🟡 paired + last_seen > 10 min (stale)
- ⚫ no paired device

### Toggle
Small "Hide drivers without radio" switch above the panel — useful when scanning who's actually on LoRa fallback.

### Files touched
- `src/pages/OrganizerLiveManage.tsx` — add the grouped panel, reuse the existing joined participants array, add helper to bucket by `run_group_id`
- `src/components/PairedRadiosPanel.tsx` (new) — extracted component to keep `OrganizerLiveManage` tidy; takes `participants` + `runGroups` as props, renders the grouped collapsible UI

### Out of scope
- Realtime push updates of `last_seen_at` (current 30s refresh is enough)
- Remote unpair / reassign by organizer
- Per-radio test-ping from organizer side

