"use client";

import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";

interface CountryStatsProps {
  segments: TravelSegment[];
}

function getDayCount(segment: TravelSegment): number {
  const start = new Date(segment.startDate + "T00:00:00");
  const end = new Date(segment.endDate + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getContinent(code: string): string {
  const map: Record<string, string> = {
    US: "Americas", MX: "Americas", PE: "Americas", BR: "Americas",
    GB: "Europe", NL: "Europe", DE: "Europe", CZ: "Europe", IT: "Europe",
    TH: "Asia", SG: "Asia", IN: "Asia", HK: "Asia",
  };
  return map[code] || "Other";
}

export function CountryStats({ segments }: CountryStatsProps) {
  const countryDays = new Map<string, number>();
  let totalDays = 0;

  for (const seg of segments) {
    const days = getDayCount(seg);
    countryDays.set(seg.countryCode, (countryDays.get(seg.countryCode) || 0) + days);
    totalDays += days;
  }

  const sorted = [...countryDays.entries()].sort((a, b) => b[1] - a[1]);
  const uniqueCountries = sorted.length;
  const maxDays = sorted.length > 0 ? sorted[0][1] : 1;

  // Continent breakdown
  const continentDays = new Map<string, number>();
  for (const [code, days] of sorted) {
    const c = getContinent(code);
    continentDays.set(c, (continentDays.get(c) || 0) + days);
  }
  const continentSorted = [...continentDays.entries()].sort((a, b) => b[1] - a[1]);

  // Longest single trip
  let longestTrip = segments[0];
  let longestDays = 0;
  for (const seg of segments) {
    const d = getDayCount(seg);
    if (d > longestDays) {
      longestDays = d;
      longestTrip = seg;
    }
  }

  // Home base (most days)
  const homeBase = sorted.length > 0 ? sorted[0] : null;

  // Months with travel (months where you're NOT in your home base)
  const homeCode = homeBase ? homeBase[0] : null;
  const travelMonths = new Set<number>();
  for (const seg of segments) {
    if (seg.countryCode === homeCode) continue;
    const start = new Date(seg.startDate + "T00:00:00");
    const end = new Date(seg.endDate + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      travelMonths.add(d.getMonth());
    }
  }

  return (
    <div className="space-y-8">
      {/* Top-level metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard value={uniqueCountries} label="Countries" icon="globe" />
        <StatCard value={totalDays} label="Days planned" icon="calendar" />
        <StatCard value={segments.length} label="Trips" icon="plane" />
        <StatCard value={travelMonths.size} label="Months abroad" icon="map" />
      </div>

      {/* Country breakdown */}
      <div className="space-y-3 max-w-lg mx-auto">
        {sorted.map(([code, days]) => {
          const info = getCountryInfo(code);
          const pct = Math.round((days / totalDays) * 100);
          const barWidth = Math.round((days / maxDays) * 100);
          return (
            <div key={code} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{info.flag}</span>
                  <span className="text-sm font-medium">{info.name}</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {days} day{days !== 1 ? "s" : ""} &middot; {pct}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${barWidth}%`, backgroundColor: info.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom row: continent split + fun facts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Continents */}
        <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            By continent
          </h3>
          {continentSorted.map(([continent, days]) => {
            const pct = Math.round((days / totalDays) * 100);
            return (
              <div key={continent} className="flex items-center justify-between text-sm">
                <span className="font-medium">{continent}</span>
                <span className="text-muted-foreground tabular-nums">{days}d ({pct}%)</span>
              </div>
            );
          })}
        </div>

        {/* Fun facts */}
        <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Highlights
          </h3>
          {homeBase && (
            <div className="text-sm">
              <span className="text-muted-foreground">Home base: </span>
              <span className="font-medium">
                {getCountryInfo(homeBase[0]).flag} {getCountryInfo(homeBase[0]).name}
              </span>
            </div>
          )}
          {longestTrip && (
            <div className="text-sm">
              <span className="text-muted-foreground">Longest trip: </span>
              <span className="font-medium">
                {getCountryInfo(longestTrip.countryCode).flag} {longestDays} days
              </span>
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">Avg trip length: </span>
            <span className="font-medium">
              {segments.length > 0 ? Math.round(totalDays / segments.length) : 0} days
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Time abroad: </span>
            <span className="font-medium">
              {Math.round(((totalDays - (homeBase?.[1] ?? 0)) / 365) * 100)}% of the year
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: "globe" | "calendar" | "plane" | "map";
}) {
  const icons = {
    globe: "\u{1F30D}",
    calendar: "\u{1F4C5}",
    plane: "\u{2708}\u{FE0F}",
    map: "\u{1F5FA}\u{FE0F}",
  };

  return (
    <div className="bg-muted/30 border rounded-xl p-3 sm:p-4 text-center">
      <p className="text-lg mb-1">{icons[icon]}</p>
      <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
