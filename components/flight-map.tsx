"use client";

import { memo, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from "react-simple-maps";
import { FlightRecord } from "@/lib/types";
import { AIRPORT_COORDS } from "@/lib/airport-coords";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

interface FlightMapProps {
  flights: FlightRecord[];
}

interface RouteData {
  from: [number, number]; // [lat, lng]
  to: [number, number];
  count: number;
  key: string;
}

interface AirportData {
  name: string;
  coords: [number, number];
  flights: number;
}

function FlightMapInner({ flights }: FlightMapProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const { routes, airports } = useMemo(() => {
    // Aggregate routes
    const routeMap = new Map<string, RouteData>();
    const airportMap = new Map<string, AirportData>();

    for (const f of flights) {
      const fromCoords = AIRPORT_COORDS[f.startCity];
      const toCoords = AIRPORT_COORDS[f.destinationCity];
      if (!fromCoords || !toCoords) continue;

      // Route key (sorted so A→B and B→A are the same route)
      const pair = [f.startCity, f.destinationCity].sort();
      const key = pair.join("|");

      const existing = routeMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        routeMap.set(key, {
          from: fromCoords,
          to: toCoords,
          count: 1,
          key,
        });
      }

      // Airports
      for (const city of [f.startCity, f.destinationCity]) {
        const coords = AIRPORT_COORDS[city];
        if (!coords) continue;
        const ap = airportMap.get(city);
        if (ap) {
          ap.flights++;
        } else {
          airportMap.set(city, {
            name: city.split(" (")[0],
            coords,
            flights: 1,
          });
        }
      }
    }

    return {
      routes: [...routeMap.values()].sort((a, b) => a.count - b.count),
      airports: [...airportMap.values()].sort((a, b) => a.flights - b.flights),
    };
  }, [flights]);

  const maxCount = Math.max(...routes.map((r) => r.count), 1);
  const maxAirportFlights = Math.max(...airports.map((a) => a.flights), 1);

  return (
    <div className="relative rounded-xl overflow-hidden border bg-card">
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: 140,
          center: [40, 20],
        }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto" }}
      >
        {/* Land masses */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rpiKey}
                geography={geo}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Flight routes */}
        {routes.map((route) => {
          const intensity = 0.15 + (route.count / maxCount) * 0.6;
          const width = 0.5 + (route.count / maxCount) * 2;
          return (
            <Line
              key={route.key}
              from={[route.from[1], route.from[0]]}
              to={[route.to[1], route.to[0]]}
              stroke={`rgba(59, 130, 246, ${intensity})`}
              strokeWidth={width}
              strokeLinecap="round"
            />
          );
        })}

        {/* Airport dots */}
        {airports.map((airport) => {
          const size = 2 + (airport.flights / maxAirportFlights) * 4;
          return (
            <Marker
              key={airport.name}
              coordinates={[airport.coords[1], airport.coords[0]]}
              onMouseEnter={() =>
                setTooltip(`${airport.name} — ${airport.flights} flights`)
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <circle
                r={size}
                fill="rgb(59, 130, 246)"
                stroke="hsl(var(--background))"
                strokeWidth={1}
                opacity={0.9}
                className="cursor-pointer"
              />
            </Marker>
          );
        })}
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-popover border text-xs shadow-sm">
          {tooltip}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          {airports.length} airports
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-blue-500 rounded" />
          {routes.length} routes
        </span>
      </div>
    </div>
  );
}

export const FlightMap = memo(FlightMapInner);
