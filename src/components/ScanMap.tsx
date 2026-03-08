"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface LocationData {
  city: string;
  region: string;
  country: string;
  count: number;
  lat: number | null;
  lng: number | null;
}

interface ScanMapProps {
  locations: LocationData[];
}

export default function ScanMap({ locations }: ScanMapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const markers = locations.filter((l) => l.lat != null && l.lng != null);

  if (markers.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-8">
        <h2 className="text-sm font-medium text-gray-400 mb-4">Scan Locations</h2>
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
          No location data with coordinates yet
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...markers.map((m) => m.count));

  function markerSize(count: number) {
    const min = 4;
    const max = 16;
    if (maxCount <= 1) return (min + max) / 2;
    return min + ((count - 1) / (maxCount - 1)) * (max - min);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-8 relative">
      <h2 className="text-sm font-medium text-gray-400 mb-4">Scan Locations</h2>
      <div className="rounded-lg overflow-hidden" style={{ background: "#111" }}>
        <ComposableMap
          projectionConfig={{ scale: 147 }}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1e1e1e"
                    stroke="#333"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#2a2a2a", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {markers.map((loc, i) => (
              <Marker
                key={i}
                coordinates={[loc.lng!, loc.lat!]}
                onMouseEnter={(e) => {
                  const label = [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${label}: ${loc.count} scan${loc.count !== 1 ? "s" : ""}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle
                  r={markerSize(loc.count)}
                  fill="#3b82f6"
                  fillOpacity={0.7}
                  stroke="#60a5fa"
                  strokeWidth={1}
                />
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-zinc-800 border border-zinc-600 rounded-lg text-xs text-gray-200 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
