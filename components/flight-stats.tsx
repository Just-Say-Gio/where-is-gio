"use client";

import { FlightAnalytics, FlightRecord } from "@/lib/types";
import { FlightMap } from "./flight-map";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Marquee } from "@/components/ui/marquee";

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

  // Top routes for marquee
  const topRoutes = [...routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([route, count]) => ({
      label: route.split(" - ").map(c => c.split(" (")[0]).join(" → "),
      count,
    }));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Flight route map */}
      <FlightMap flights={flights} />

      {/* Top metrics */}
      <BlurFade delay={0.05} inView>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={totalFlights} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Flights</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={totalCities} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Airports</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold">
              <NumberTicker value={hours} />{hasPartialDuration ? "+" : ""}
              <span className="text-sm font-normal text-muted-foreground">h</span>
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">In the air</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={uniqueAirlines} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Airlines</p>
          </div>
        </div>
      </BlurFade>

      {/* Cool facts row */}
      <BlurFade delay={0.1} inView>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {longestFlight && (
            <MagicCard className="rounded-xl px-4 py-3 text-center" gradientColor="rgba(59,130,246,0.12)">
              <p className="text-xs text-muted-foreground mb-1">Longest flight</p>
              <p className="text-sm font-semibold">{formatDuration(longestFlight.durationMinutes)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {longestFlight.startCity.split(" (")[0]} &rarr; {longestFlight.destinationCity.split(" (")[0]}
              </p>
            </MagicCard>
          )}
          {busiestRoute && (
            <MagicCard className="rounded-xl px-4 py-3 text-center" gradientColor="rgba(16,185,129,0.12)">
              <p className="text-xs text-muted-foreground mb-1">Busiest route</p>
              <p className="text-sm font-semibold">{busiestRoute[1]}x</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {busiestRoute[0].split(" - ").map(c => c.split(" (")[0]).join(" - ")}
              </p>
            </MagicCard>
          )}
          {topAirport && (
            <MagicCard className="rounded-xl px-4 py-3 text-center" gradientColor="rgba(139,92,246,0.12)">
              <p className="text-xs text-muted-foreground mb-1">Top airport</p>
              <p className="text-sm font-semibold">{topAirport[1]} flights</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {topAirport[0].split(" (")[0]}
              </p>
            </MagicCard>
          )}
        </div>
      </BlurFade>

      {/* Business vs Leisure + Avg Duration */}
      <BlurFade delay={0.15} inView>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(59,130,246,0.12)">
            <div className="flex items-center gap-4">
              <AnimatedCircularProgressBar
                value={businessPct}
                max={100}
                min={0}
                gaugePrimaryColor="#3B82F6"
                gaugeSecondaryColor="rgba(59,130,246,0.15)"
                className="size-20 sm:size-24 text-lg sm:text-xl shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">
                  Flight Purpose
                </p>
                <p className="text-sm font-medium">
                  <NumberTicker value={businessPct} />% Business
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {100 - businessPct}% Leisure
                </p>
              </div>
            </div>
          </MagicCard>

          <MagicCard className="rounded-xl p-4" gradientColor="rgba(139,92,246,0.12)">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Cabin & Duration
            </p>
            <div className="space-y-1.5">
              {classSorted.map(([cls, count]) => (
                <div key={cls} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cls}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
              {avgDuration > 0 && (
                <div className="flex items-center justify-between text-sm pt-1.5 border-t border-border/50">
                  <span className="text-muted-foreground">Avg flight</span>
                  <span className="font-semibold tabular-nums">{formatDuration(avgDuration)}</span>
                </div>
              )}
            </div>
          </MagicCard>
        </div>
      </BlurFade>

      {/* Flights by year */}
      <BlurFade delay={0.2} inView>
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
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-700 ease-out"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </BlurFade>

      {/* Airlines + Aircraft */}
      <BlurFade delay={0.25} inView>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MagicCard className="rounded-xl p-4 space-y-1.5" gradientColor="rgba(99,102,241,0.1)">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Top airlines
            </h3>
            {airlinesSorted.map(([airline, count]) => (
              <div key={airline} className="flex items-center justify-between text-sm">
                <span className="truncate mr-2">{airline}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{count}</span>
              </div>
            ))}
          </MagicCard>

          <MagicCard className="rounded-xl p-4 space-y-1.5" gradientColor="rgba(99,102,241,0.1)">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Aircraft types
            </h3>
            {aircraftSorted.map(([aircraft, count]) => (
              <div key={aircraft} className="flex items-center justify-between text-sm">
                <span className="truncate mr-2">{aircraft}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{count}</span>
              </div>
            ))}
          </MagicCard>
        </div>
      </BlurFade>

      {/* Route Marquee */}
      {topRoutes.length > 3 && (
        <BlurFade delay={0.3} inView>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent" />
            <Marquee pauseOnHover className="[--duration:25s] [--gap:2rem]">
              {topRoutes.map((route, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                  <span>✈</span>
                  <span>{route.label}</span>
                  <span className="text-xs tabular-nums">({route.count}x)</span>
                </div>
              ))}
            </Marquee>
          </div>
        </BlurFade>
      )}
    </div>
  );
}
