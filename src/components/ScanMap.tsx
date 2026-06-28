"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

// World country borders (topojson) served from a CDN.
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type MapLocation = {
  city: string | null;
  region: string | null;
  country: string;
  count: number;
  lat: number | null;
  lng: number | null;
};

export default function ScanMap({ locations }: { locations: MapLocation[] }) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({ coordinates: [0, 25], zoom: 1 });

  const clampZoom = (z: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const zoomIn = () =>
    setPosition((p) => ({ ...p, zoom: clampZoom(p.zoom * 1.5) }));
  const zoomOut = () =>
    setPosition((p) => ({ ...p, zoom: clampZoom(p.zoom / 1.5) }));
  const resetView = () => setPosition({ coordinates: [0, 25], zoom: 1 });

  const markers = locations.filter((l) => l.lat != null && l.lng != null);

  if (markers.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-600">
        No location data with coordinates yet
      </div>
    );
  }

  const maxCount = Math.max(...markers.map((m) => m.count));
  const markerSize = (count: number) => {
    const min = 4;
    const max = 16;
    if (maxCount <= 1) return (min + max) / 2;
    return min + ((count - 1) / (maxCount - 1)) * (max - min);
  };

  return (
    <div className="relative">
      <div
        className="overflow-hidden rounded-lg"
        style={{ background: "#0b0b0f" }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 110, center: [0, 25] }}
          width={800}
          height={400}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup
            center={position.coordinates}
            zoom={position.zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onMoveEnd={(pos: {
              coordinates: [number, number];
              zoom: number;
            }) => setPosition(pos)}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#18181b"
                    stroke="#27272a"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#27272a", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {markers.map((loc, i) => (
              <Marker
                key={i}
                coordinates={[loc.lng as number, loc.lat as number]}
                onMouseEnter={(e: React.MouseEvent) => {
                  const label =
                    [loc.city, loc.region, loc.country]
                      .filter(Boolean)
                      .join(", ") || "Unknown";
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${label}: ${loc.count} scan${
                      loc.count !== 1 ? "s" : ""
                    }`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* divide by zoom so markers keep a constant on-screen size */}
                <circle
                  r={markerSize(loc.count) / position.zoom}
                  fill="#3b82f6"
                  fillOpacity={0.65}
                  stroke="#60a5fa"
                  strokeWidth={1.2 / position.zoom}
                />
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Zoom controls */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          disabled={position.zoom >= MAX_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/90 text-lg leading-none text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          disabled={position.zoom <= MIN_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/90 text-lg leading-none text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset map view"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/90 text-xs leading-none text-zinc-200 hover:bg-zinc-800"
        >
          ⤢
        </button>
      </div>
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
