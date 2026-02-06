"use client";

import { FlightAnalytics } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";

interface FlightStatsProps {
  analytics: FlightAnalytics;
}

const TOTAL_COUNTRIES_WORLD = 195;

export function FlightStats({ analytics }: FlightStatsProps) {
  const {
    totalFlights,
    totalCities,
    totalFlightHours,
    flightsByYear,
    flightsByAirline,
    flightsByAircraftFamily,
    flightsByClass,
    visitedCountries,
  } = analytics;

  // Use visited-countries.json data if available, otherwise fall back to flight-derived
  const visitedCount = visitedCountries?.totalVisited ?? analytics.totalCountries;
  const allVisitedCodes = visitedCountries?.allCodes ?? analytics.countriesVisited;
  const regions = visitedCountries?.regions ?? null;

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
  const hasPartialDuration = totalFlightHours < totalFlights * 0.5;

  // Regional stats sorted by visited count
  const regionsSorted = regions
    ? Object.entries(regions)
        .filter(([, r]) => r.total > 0)
        .sort((a, b) => b[1].visited - a[1].visited)
    : [];

  return (
    <div className="space-y-8">
      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-muted/30 border rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg mb-1">{"\u{1F30D}"}</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">
            {visitedCount}
            <span className="text-sm font-normal text-muted-foreground">/{TOTAL_COUNTRIES_WORLD}</span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Countries</p>
        </div>
        <div className="bg-muted/30 border rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg mb-1">{"\u{2708}\u{FE0F}"}</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{totalFlights}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Flights</p>
        </div>
        <div className="bg-muted/30 border rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg mb-1">{"\u{1F3D9}\u{FE0F}"}</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{totalCities}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Airports</p>
        </div>
        <div className="bg-muted/30 border rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg mb-1">{"\u{23F1}\u{FE0F}"}</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">
            {hours}{hasPartialDuration ? "+" : ""}
            <span className="text-sm font-normal text-muted-foreground">h</span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">In the air</p>
        </div>
      </div>

      {/* Country progress bar */}
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Country tracker</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {visitedCount} of {TOTAL_COUNTRIES_WORLD} ({Math.round((visitedCount / TOTAL_COUNTRIES_WORLD) * 100)}%)
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${(visitedCount / TOTAL_COUNTRIES_WORLD) * 100}%` }}
          />
        </div>
      </div>

      {/* Regional breakdown */}
      {regionsSorted.length > 0 && (
        <div className="max-w-lg mx-auto space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            By region
          </h3>
          {regionsSorted.map(([name, region]) => {
            const pct = Math.round((region.visited / region.total) * 100);
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {region.visited}/{region.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Countries visited — flag grid */}
      <div className="max-w-lg mx-auto">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
          Countries visited
        </h3>
        <div className="flex flex-wrap gap-2">
          {allVisitedCodes.map((code) => {
            const info = getCountryInfo(code);
            return (
              <div
                key={code}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border text-sm"
                title={info.name}
              >
                <span>{info.flag}</span>
                <span className="text-xs text-muted-foreground">{info.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flights by year */}
      <div className="max-w-lg mx-auto space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          Flights by year
        </h3>
        {yearsSorted.map(([year, count]) => {
          const barWidth = Math.round((count / maxYearFlights) * 100);
          return (
            <div key={year}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium tabular-nums">{year}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {count} flight{count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-muted/30 border rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Top airlines
          </h3>
          {airlinesSorted.map(([airline, count]) => (
            <div key={airline} className="flex items-center justify-between text-sm">
              <span className="truncate mr-2">{airline}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">{count}</span>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 border rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
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

      {/* Class breakdown */}
      <div className="max-w-lg mx-auto">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
          Cabin class
        </h3>
        <div className="flex gap-3 flex-wrap">
          {classSorted.map(([cls, count]) => (
            <div key={cls} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border text-sm">
              <span className="font-medium">{cls}</span>
              <span className="text-muted-foreground tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
