"use client";

import { VisitedCountriesData } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { NumberTicker } from "@/components/ui/number-ticker";

interface CountryTrackerProps {
  data: VisitedCountriesData;
}

const TOTAL_COUNTRIES_WORLD = 195;

export function CountryTracker({ data }: CountryTrackerProps) {
  const { totalVisited, regions, allCodes } = data;
  const pctWorld = Math.round((totalVisited / TOTAL_COUNTRIES_WORLD) * 100);

  // Sort regions by visited count descending, filter out empty ones
  const regionsSorted = Object.entries(regions)
    .filter(([, r]) => r.total > 0)
    .sort((a, b) => b[1].visited - a[1].visited);

  // Region with highest completion %
  const topRegion = regionsSorted
    .filter(([, r]) => r.visited > 0)
    .sort((a, b) => (b[1].visited / b[1].total) - (a[1].visited / a[1].total))[0];

  return (
    <div className="space-y-6">
      {/* Big number + progress */}
      <div className="text-center">
        <p className="text-4xl sm:text-5xl font-bold">
          <NumberTicker value={totalVisited} />
          <span className="text-lg sm:text-xl font-normal text-muted-foreground">/{TOTAL_COUNTRIES_WORLD}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          countries visited &middot; {pctWorld}% of the world
        </p>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${pctWorld}%` }}
          />
        </div>
      </div>

      {/* Regional breakdown */}
      <div className="max-w-lg mx-auto space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          By region
        </h3>
        {regionsSorted.map(([name, region]) => {
          const pct = region.visited > 0 ? Math.round((region.visited / region.total) * 100) : 0;
          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {region.visited}/{region.total} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Flag grid */}
      <div className="max-w-lg mx-auto">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
          All countries
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {allCodes.map((code) => {
            const info = getCountryInfo(code);
            return (
              <div
                key={code}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border text-xs"
                title={info.name}
              >
                <span>{info.flag}</span>
                <span className="text-muted-foreground">{info.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fun fact */}
      {topRegion && (
        <p className="text-center text-xs text-muted-foreground">
          Best explored region: {topRegion[0]} ({Math.round((topRegion[1].visited / topRegion[1].total) * 100)}%)
        </p>
      )}
    </div>
  );
}
