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
  // Aggregate days per country
  const countryDays = new Map<string, number>();
  let totalDays = 0;

  for (const seg of segments) {
    const days = getDayCount(seg);
    countryDays.set(seg.countryCode, (countryDays.get(seg.countryCode) || 0) + days);
    totalDays += days;
  }

  // Sort by days descending
  const sorted = [...countryDays.entries()].sort((a, b) => b[1] - a[1]);
  const uniqueCountries = sorted.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-6 sm:gap-10 text-center">
        <div>
          <p className="text-2xl sm:text-3xl font-bold">{uniqueCountries}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Countries</p>
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-bold">{totalDays}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Days planned</p>
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-bold">{segments.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Trips</p>
        </div>
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        {sorted.map(([code, days]) => {
          const info = getCountryInfo(code);
          const pct = Math.round((days / totalDays) * 100);
          return (
            <div key={code} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-center shrink-0">{info.flag}</span>
              <span className="w-24 sm:w-32 truncate text-muted-foreground">{info.name}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: info.color }}
                />
              </div>
              <span className="w-16 text-right text-muted-foreground text-xs tabular-nums">
                {days}d ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
