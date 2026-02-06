"use client";

import { CalendarDay } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";

interface CountryStatsProps {
  months: CalendarDay[][];
}

export function CountryStats({ months }: CountryStatsProps) {
  // Flatten all calendar days — each day already has its resolved segment
  // (overlap/priority handled by assignSegmentsToDays)
  const allDays = months.flat();

  // Count days per country (each calendar day counted exactly once)
  const countryDays = new Map<string, number>();
  let coveredDays = 0;

  for (const day of allDays) {
    if (!day.segment) continue;
    coveredDays++;
    const code = day.segment.countryCode;
    countryDays.set(code, (countryDays.get(code) || 0) + 1);
  }

  const sorted = [...countryDays.entries()].sort((a, b) => b[1] - a[1]);
  const uniqueCountries = sorted.length;
  const maxDays = sorted.length > 0 ? sorted[0][1] : 1;

  // Home base = country with most days
  const homeCode = sorted.length > 0 ? sorted[0][0] : null;
  const homeDays = sorted.length > 0 ? sorted[0][1] : 0;
  const daysAbroad = coveredDays - homeDays;

  // Count distinct trips abroad (a "trip" = consecutive day(s) away from home)
  let trips = 0;
  let longestTripDays = 0;
  let longestTripCountry = "";
  let currentTripDays = 0;
  let currentTripCountries = new Set<string>();
  let wasAbroad = false;

  for (const day of allDays) {
    const code = day.segment?.countryCode ?? null;
    const abroad = code !== null && code !== homeCode;

    if (abroad) {
      if (!wasAbroad) {
        // Starting a new trip
        trips++;
        currentTripDays = 0;
        currentTripCountries = new Set();
      }
      currentTripDays++;
      currentTripCountries.add(code!);

      if (currentTripDays > longestTripDays) {
        longestTripDays = currentTripDays;
        // Label with the most-visited country in this trip
        longestTripCountry = [...currentTripCountries]
          .sort((a, b) => {
            const aDays = allDays.filter(d => d.segment?.countryCode === a).length;
            const bDays = allDays.filter(d => d.segment?.countryCode === b).length;
            return bDays - aDays;
          })[0] || code!;
      }
    } else {
      currentTripDays = 0;
    }

    wasAbroad = abroad;
  }

  // Months with at least one day abroad
  const travelMonths = new Set<number>();
  for (const day of allDays) {
    if (!day.segment || day.segment.countryCode === homeCode) continue;
    const month = new Date(day.date + "T00:00:00").getMonth();
    travelMonths.add(month);
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
          const pct = Math.round((days / coveredDays) * 100);
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
      <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center text-xs text-muted-foreground max-w-lg mx-auto">
        {homeCode && (
          <span>
            Home base: {getCountryInfo(homeCode).flag} {getCountryInfo(homeCode).name}
          </span>
        )}
        {longestTripDays > 0 && (
          <span>
            Longest trip: {getCountryInfo(longestTripCountry).flag} {longestTripDays}d
          </span>
        )}
        <span>
          Abroad: {Math.round((daysAbroad / 365) * 100)}% of the year
        </span>
      </div>
    </div>
  );
}
