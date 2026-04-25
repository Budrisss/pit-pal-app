// Compute the bearing (degrees, 0=N, 90=E) that orients a track polyline's
// longest axis horizontally on screen, and return the bounding box.
// Uses 2D PCA on lon/lat scaled by cos(meanLat) so distances are roughly
// equal-area near the track.

export interface OrientResult {
  bearing: number; // degrees, 0..360
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  center: [number, number]; // [lng, lat]
}

export function computeBestBearing(coords: Array<[number, number]>): OrientResult | null {
  // coords come in as [lat, lng] (Leaflet convention used elsewhere in app)
  if (!coords || coords.length < 2) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const meanLat = (minLat + maxLat) / 2;
  const meanLng = (minLng + maxLng) / 2;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);

  // Project to a local planar frame in meters-ish
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [lat, lng] of coords) {
    xs.push((lng - meanLng) * cosLat);
    ys.push(lat - meanLat);
  }

  // 2D covariance
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxx += xs[i] * xs[i];
    syy += ys[i] * ys[i];
    sxy += xs[i] * ys[i];
  }
  const n = xs.length;
  sxx /= n; syy /= n; sxy /= n;

  // Principal axis angle (radians from +x axis, i.e. east)
  // theta = 0.5 * atan2(2*sxy, sxx - syy)
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);

  // Convert "axis from east" → "compass bearing of the longest axis" (clockwise from north)
  // Map screen +x is east; we want longest axis to lie along screen +x.
  // MapLibre `bearing` rotates the map clockwise; setting bearing = -axisAngleFromEast (in degrees, normalized)
  // makes the longest axis horizontal on screen.
  let bearingDeg = -((theta * 180) / Math.PI);
  bearingDeg = ((bearingDeg % 360) + 360) % 360;
  // Normalize to [-180, 180] then back into 0..360 — pick the rotation closest to 0 to avoid
  // upside-down framing when both 0 and 180 work equivalently for a symmetric axis.
  if (bearingDeg > 90 && bearingDeg < 270) {
    bearingDeg = (bearingDeg + 180) % 360;
  }

  return {
    bearing: bearingDeg,
    bounds: { minLng, minLat, maxLng, maxLat },
    center: [meanLng, meanLat],
  };
}