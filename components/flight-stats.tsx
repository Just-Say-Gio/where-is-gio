"use client";

import { FlightAnalytics, FlightRecord } from "@/lib/types";

interface FlightStatsProps {
  analytics: FlightAnalytics;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getRouteKey(f: FlightRecord): string {
  const pair = [f.startCity, f.destinationCity].sort();
  return `${pair[0]} - ${pair[1]}`;
}

export function FlightStats({ analytics }: FlightStatsProps) {
  const {
    totalFlights,
    flights,
    totalCities,
    totalFlightHours,
    flightsByYear,
    flightsByAirline,
    flightsByAircraftFamily,
    flightsByClass,
    flightsByReason,
  } = analytics;

  // Sort breakdowns
  const yearsSorted = Object.entries(flightsByYear).sort((a, b) => b[0].localeCompare(a[0]));
  const maxYearFlights = Math.max(...yearsSorted.map(([, n]) => n));

  const airlinesSorted = Object.entries(flightsByAirline)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const aircraftSorted = Object.entries(flightsByAircraftFamily)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const classSorted = Object.entries(flightsByClass).sort((a, b) => b[1] - a[1]);

  // Hours display
  const hours = Math.floor(totalFlightHours);
  const flightsWithDuration = flights.filter((f) => f.durationMinutes > 0);
  const hasPartialDuration = flightsWithDuration.length < totalFlights;

  // Derived stats
  const uniqueAirlines = Object.keys(flightsByAirline).length;

  // Busiest route
  const routeCounts = new Map<string, number>();
  for (const f of flights) {
    const key = getRouteKey(f);
    routeCounts.set(key, (routeCounts.get(key) || 0) + 1);
  }
  const busiestRoute = [...routeCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Most visited airport
  const airportCounts = new Map<string, number>();
  for (const f of flights) {
    airportCounts.set(f.startCity, (airportCounts.get(f.startCity) || 0) + 1);
    airportCounts.set(f.destinationCity, (airportCounts.get(f.destinationCity) || 0) + 1);
  }
  const topAirport = [...airportCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Longest flight
  const longestFlight = flightsWithDuration.length > 0
    ? flightsWithDuration.reduce((a, b) => (a.durationMinutes > b.durationMinutes ? a : b))
    : null;

  // Average flight duration (only flights with duration data)
  const avgDuration = flightsWithDuration.length > 0
    ? Math.round(flightsWithDuration.reduce((s, f) => s + f.durationMinutes, 0) / flightsWithDuration.length)
    : 0;

  // Business vs Leisure
  const businessCount = flightsByReason["Business"] || 0;
  const leisureCount = flightsByReason["Leisure"] || 0;
  const businessPct = totalFlights > 0 ? Math.round((businessCount / totalFlights) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{totalFlights}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Flights</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{totalCities}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Airports</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">
            {hours}{hasPartialDuration ? "+" : ""}
            <span className="text-sm font-normal text-muted-foreground">h</span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">In the air</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{uniqueAirlines}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Airlines</p>
        </div>
      </div>

      {/* Cool facts row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {longestFlight && (
          <div className="bg-muted/30 border rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Longest flight</p>
            <p className="text-sm font-semibold">{formatDuration(longestFlight.durationMinutes)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {longestFlight.startCity.split(" (")[0]} &rarr; {longestFlight.destinationCity.split(" (")[0]}
            </p>
          </div>
        )}
        {busiestRoute && (
          <div className="bg-muted/30 border rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Busiest route</p>
            <p className="text-sm font-semibold">{busiestRoute[1]}x</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {busiestRoute[0].split(" - ").map(c => c.split(" (")[0]).join(" - ")}
            </p>
          </div>
        )}
        {topAirport && (
          <div className="bg-muted/30 border rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Top airport</p>
            <p className="text-sm font-semibold">{topAirport[1]} flights</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {topAirport[0].split(" (")[0]}
            </p>
          </div>
        )}
      </div>

      {/* Flights by year */}
      <div className="max-w-lg mx-auto space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          Flights by year
        </h3>
        {yearsSorted.map(([year, count]) => {
          const barWidth = Math.round((count / maxYearFlights) * 100);
          return (
            <div key={year}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium tabular-nums">{year}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} flight{count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Airlines + Aircraft */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        <div className="bg-muted/30 border rounded-xl p-4 space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
            Top airlines
          </h3>
          {airlinesSorted.map(([airline, count]) => (
            <div key={airline} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{airline}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{count}</span>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 border rounded-xl p-4 space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
            Aircraft types
          </h3>
          {aircraftSorted.map(([aircraft, count]) => (
            <div key={aircraft} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{aircraft}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: class + reason + avg duration */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
        {classSorted.map(([cls, count]) => (
          <span key={cls} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border text-xs">
            <span className="font-medium">{cls}</span>
            <span className="text-muted-foreground tabular-nums">{count}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs">
          <span className="font-medium">Business</span>
          <span className="text-muted-foreground tabular-nums">{businessPct}%</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <span className="font-medium">Leisure</span>
          <span className="text-muted-foreground tabular-nums">{100 - businessPct}%</span>
        </span>
        {avgDuration > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border text-xs">
            <span className="font-medium">Avg flight</span>
            <span className="text-muted-foreground tabular-nums">{formatDuration(avgDuration)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
