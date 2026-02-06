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

const ARC_COLORS = ["#06b6d4", "#3b82f6", "#6366f1"];

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
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 13.69, lng: 100.75 }, // Bangkok — home base
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

function calcArcAlt(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Higher arc for longer distances
  const dLat = Math.abs(lat1 - lat2);
  const dLng = Math.abs(lng1 - lng2);
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  // Scale: short ~0.1, medium ~0.3, long ~0.5
  return Math.min(0.05 + dist * 0.003, 0.6);
}

function FlightGlobeInner({ flights }: FlightMapProps) {
  const arcs = useMemo(() => {
    // Aggregate routes bidirectionally
    const routeMap = new Map<
      string,
      { from: [number, number]; to: [number, number]; count: number }
    >();

    for (const f of flights) {
      const fromCoords = AIRPORT_COORDS[f.startCity];
      const toCoords = AIRPORT_COORDS[f.destinationCity];
      if (!fromCoords || !toCoords) continue;

      const pair = [f.startCity, f.destinationCity].sort();
      const key = pair.join("|");

      const existing = routeMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        routeMap.set(key, { from: fromCoords, to: toCoords, count: 1 });
      }
    }

    // Convert to arc data — assign order for staggered animation
    const routes = [...routeMap.values()].sort((a, b) => b.count - a.count);

    return routes.map((route, i) => ({
      order: (i % 14) + 1,
      startLat: route.from[0],
      startLng: route.from[1],
      endLat: route.to[0],
      endLng: route.to[1],
      arcAlt: calcArcAlt(
        route.from[0],
        route.from[1],
        route.to[0],
        route.to[1]
      ),
      color: ARC_COLORS[i % ARC_COLORS.length],
    }));
  }, [flights]);

  return (
    <div className="relative w-full h-72 md:h-[28rem] rounded-xl overflow-hidden">
      <div className="absolute inset-0">
        <World data={arcs} globeConfig={globeConfig} />
      </div>
      {/* Bottom fade */}
      <div className="absolute w-full bottom-0 inset-x-0 h-20 bg-gradient-to-b pointer-events-none select-none from-transparent to-background z-10" />
      {/* Legend */}
      <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[10px] text-muted-foreground z-20">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          {new Set(flights.flatMap((f) => [f.startCity, f.destinationCity])).size}{" "}
          airports
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-cyan-400 rounded" />
          {arcs.length} routes
        </span>
      </div>
    </div>
  );
}

export const FlightMap = memo(FlightGlobeInner);
