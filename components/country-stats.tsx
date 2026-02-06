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

  // Home base = most days
  const homeCode = sorted.length > 0 ? sorted[0][0] : null;
  const homeDays = sorted.length > 0 ? sorted[0][1] : 0;
  const daysAbroad = totalDays - homeDays;

  // Longest single trip away from home
  let longestTrip: TravelSegment | null = null;
  let longestDays = 0;
  for (const seg of segments) {
    if (seg.countryCode === homeCode) continue;
    const d = getDayCount(seg);
    if (d > longestDays) {
      longestDays = d;
      longestTrip = seg;
    }
  }

  // Distinct trips (consecutive segments in same country don't double-count)
  const trips = segments.filter((s) => s.countryCode !== homeCode).length;

  // Months with travel
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
    <div className="space-y-6">
      {/* Metric row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{uniqueCountries}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Countries</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{daysAbroad}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Days abroad</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{trips}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Trips</p>
        </div>
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{travelMonths.size}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Months abroad</p>
        </div>
      </div>

      {/* Country breakdown */}
      <div className="space-y-2.5 max-w-lg mx-auto">
        {sorted.map(([code, days]) => {
          const info = getCountryInfo(code);
          const pct = Math.round((days / totalDays) * 100);
          const barWidth = Math.round((days / maxDays) * 100);
          return (
            <div key={code}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{info.flag}</span>
                  <span className="text-sm font-medium">{info.name}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {days}d &middot; {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${barWidth}%`, backgroundColor: info.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Highlights */}
      {longestTrip && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center text-xs text-muted-foreground max-w-lg mx-auto">
          {homeCode && (
            <span>
              Home base: {getCountryInfo(homeCode).flag} {getCountryInfo(homeCode).name}
            </span>
          )}
          <span>
            Longest trip: {getCountryInfo(longestTrip.countryCode).flag} {longestDays}d
          </span>
          <span>
            Abroad: {Math.round((daysAbroad / 365) * 100)}% of the year
          </span>
        </div>
      )}
    </div>
  );
}
