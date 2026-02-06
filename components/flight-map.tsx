"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { FlightRecord } from "@/lib/types";
import { AIRPORT_COORDS } from "@/lib/airport-coords";
import type { GlobeConfig } from "@/components/ui/globe";

const World = dynamic(
  () => import("@/components/ui/globe").then((m) => m.World),
  { ssr: false }
);

interface FlightMapProps {
  flights: FlightRecord[];
}

// Color per year — oldest to newest journey
const YEAR_COLORS: Record<number, string> = {
  2018: "#94a3b8", // slate
  2019: "#a78bfa", // violet
  2020: "#f87171", // red (covid year)
  2021: "#fb923c", // orange
  2022: "#facc15", // yellow
  2023: "#4ade80", // green
  2024: "#38bdf8", // sky
  2025: "#818cf8", // indigo
  2026: "#f472b6", // pink
};
const DEFAULT_COLOR = "#6366f1";

const globeConfig: GlobeConfig = {
  pointSize: 4,
  globeColor: "#062056",
  showAtmosphere: true,
  atmosphereColor: "#FFFFFF",
  atmosphereAltitude: 0.1,
  emissive: "#062056",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "rgba(255,255,255,0.7)",
  ambientLight: "#38bdf8",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1500,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 13.69, lng: 100.75 }, // Bangkok — home base
  autoRotate: true,
  autoRotateSpeed: 0.3,
};

function calcArcAlt(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = Math.abs(lat1 - lat2);
  const dLng = Math.abs(lng1 - lng2);
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  return Math.min(0.05 + dist * 0.003, 0.6);
}

function FlightGlobeInner({ flights }: FlightMapProps) {
  const { arcs, yearRange } = useMemo(() => {
    // Sort flights chronologically — this creates the journey
    const sorted = [...flights]
      .filter((f) => AIRPORT_COORDS[f.startCity] && AIRPORT_COORDS[f.destinationCity])
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return { arcs: [], yearRange: "" };

    const firstYear = sorted[0].year;
    const lastYear = sorted[sorted.length - 1].year;
    const range =
      firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;

    // Each flight = one arc, ordered chronologically
    // Group into waves of ~4 flights per order for smooth animation
    const BATCH_SIZE = 4;
    const arcData = sorted.map((f, i) => {
      const from = AIRPORT_COORDS[f.startCity];
      const to = AIRPORT_COORDS[f.destinationCity];
      return {
        order: Math.floor(i / BATCH_SIZE) + 1,
        startLat: from[0],
        startLng: from[1],
        endLat: to[0],
        endLng: to[1],
        arcAlt: calcArcAlt(from[0], from[1], to[0], to[1]),
        color: YEAR_COLORS[f.year] || DEFAULT_COLOR,
      };
    });

    return { arcs: arcData, yearRange: range };
  }, [flights]);

  const uniqueAirports = new Set(
    flights.flatMap((f) => [f.startCity, f.destinationCity])
  ).size;

  // Unique years present for legend
  const years = useMemo(() => {
    const ys = [...new Set(flights.map((f) => f.year))].sort();
    return ys.filter((y) => YEAR_COLORS[y]);
  }, [flights]);

  return (
    <div className="relative w-full h-72 md:h-[28rem] rounded-xl overflow-hidden">
      <div className="absolute inset-0">
        <World data={arcs} globeConfig={globeConfig} />
      </div>
      {/* Bottom fade */}
      <div className="absolute w-full bottom-0 inset-x-0 h-20 bg-gradient-to-b pointer-events-none select-none from-transparent to-background z-10" />
      {/* Year color legend */}
      <div className="absolute top-2 left-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground z-20">
        {years.map((y) => (
          <span key={y} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: YEAR_COLORS[y] }}
            />
            {y}
          </span>
        ))}
      </div>
      {/* Stats legend */}
      <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[10px] text-muted-foreground z-20">
        <span>{flights.length} flights</span>
        <span>{uniqueAirports} airports</span>
        {yearRange && <span>{yearRange}</span>}
      </div>
    </div>
  );
}

export const FlightMap = memo(FlightGlobeInner);
