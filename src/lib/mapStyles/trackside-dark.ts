import type { StyleSpecification } from "maplibre-gl";

// Trackside dark style — uses OpenFreeMap's free OpenMapTiles vector tiles
// (no API key required) and applies a hand-tuned dark palette where the
// racetrack (highway=raceway) glows in our primary red.

const TRACK_RED = "#ef4444";
const TRACK_GLOW = "#ef4444";
const BG = "#0f172a";
const WATER = "#1e293b";
const LAND = "#111827";
const PARK = "#162033";
const PARKING = "#1a2438";
const ROAD_MINOR = "#2a3447";
const ROAD_MAJOR = "#3a4660";
const ROAD_HW = "#4a5878";
const BUILDING = "#1c2740";
const LABEL = "#e5e7eb";
const LABEL_HALO = "#0b1120";

export const tracksideDarkStyle: StyleSpecification = {
  version: 8,
  name: "Trackside Dark",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": BG } },
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      paint: { "fill-color": LAND, "fill-opacity": 0.6 },
    },
    {
      id: "landuse-park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", "class", "park", "wood", "grass", "cemetery", "pitch"],
      paint: { "fill-color": PARK, "fill-opacity": 0.7 },
    },
    {
      id: "landuse-parking",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["==", "class", "parking"],
      minzoom: 13,
      paint: { "fill-color": PARKING, "fill-opacity": 0.9 },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": WATER },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: { "line-color": WATER, "line-width": 1 },
    },
    // Road minor casing/line
    {
      id: "road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "minor", "service", "track"],
      minzoom: 12,
      paint: {
        "line-color": ROAD_MINOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 18, 4],
      },
    },
    {
      id: "road-secondary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "secondary", "tertiary"],
      paint: {
        "line-color": ROAD_MAJOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 18, 8],
      },
    },
    {
      id: "road-primary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "primary", "trunk"],
      paint: {
        "line-color": ROAD_HW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 18, 12],
      },
    },
    {
      id: "road-motorway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", "class", "motorway"],
      paint: {
        "line-color": ROAD_HW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 18, 14],
      },
    },
    // ============== RACETRACK — the hero ==============
    {
      id: "raceway-glow",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", "class", "raceway"],
      minzoom: 10,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": TRACK_GLOW,
        "line-blur": 6,
        "line-opacity": 0.55,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 12, 18, 28],
      },
    },
    {
      id: "raceway-line",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", "class", "raceway"],
      minzoom: 10,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": TRACK_RED,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 4, 18, 10],
      },
    },
    // 3D buildings
    {
      id: "buildings-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": BUILDING,
        "fill-extrusion-height": [
          "interpolate", ["linear"], ["zoom"],
          14, 0,
          15.5, ["coalesce", ["get", "render_height"], 8],
        ],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.7,
      },
    },
    // Labels
    {
      id: "place-city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: ["in", "class", "city", "town", "village", "suburb"],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 14, 16],
      },
      paint: {
        "text-color": LABEL,
        "text-halo-color": LABEL_HALO,
        "text-halo-width": 1.4,
      },
    },
    {
      id: "road-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
      },
      paint: {
        "text-color": "#cbd5e1",
        "text-halo-color": LABEL_HALO,
        "text-halo-width": 1.2,
      },
    },
  ],
};

// Satellite raster style (Esri World Imagery) — no key required
export const tracksideSatelliteStyle: StyleSpecification = {
  version: 8,
  name: "Trackside Satellite",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    sat: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0a0a0a" } },
    { id: "sat", type: "raster", source: "sat" },
  ],
};