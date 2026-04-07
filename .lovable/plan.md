

## Make "Get Directions" Button Work

### Change

**File: `src/pages/EventDetails.tsx`**

Update the "Get Directions" button's `onClick` to open Google Maps directions using the event's address:

```tsx
<Button
  variant="outline"
  className="flex-1"
  onClick={() => {
    const query = encodeURIComponent(event.address || event.track);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  }}
>
  <NavigationIcon size={16} />
  Get Directions
</Button>
```

This opens Google Maps in a new tab with the event's address (or track name as fallback) as the destination, letting the user's current location be the origin automatically.

