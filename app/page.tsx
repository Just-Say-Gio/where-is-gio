import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getCachedSegments, getCachedMonthInsights, getCachedYearSummary } from "@/lib/cache";
import { getCachedFlightAnalytics } from "@/lib/flights-cache";
import { loadVisitedCountries } from "@/lib/flights-parser";
import { generateYearDays, assignSegmentsToDays } from "@/lib/calendar-utils";
import { getRiceRunsMap } from "@/lib/rice-runs";
import { CalendarWrapper } from "@/components/calendar-wrapper";
import type { MapsStatsData, HeatmapData } from "@/lib/types";

export const revalidate = 60; // re-check cache every minute
export const dynamic = "force-dynamic";

const YEAR = 2026;

function loadMapsStats(): MapsStatsData | null {
  try {
    const p = join(process.cwd(), "data", "maps-stats.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function loadHeatmapData(): HeatmapData | null {
  try {
    const p = join(process.cwd(), "data", "maps-heatmap.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export default async function Home() {
  const segments = getCachedSegments() ?? [];
  const months = assignSegmentsToDays(generateYearDays(YEAR), segments);
  const flightAnalytics = getCachedFlightAnalytics();
  const visitedCountries = loadVisitedCountries();
  const monthInsights = getCachedMonthInsights();
  const yearSummary = getCachedYearSummary();
  const mapsStats = loadMapsStats();
  const heatmapData = loadHeatmapData();
  const riceRunsMap = getRiceRunsMap();
  const riceRunDates = Object.keys(riceRunsMap);

  return (
    <main className="min-h-screen bg-background">
      {segments.length === 0 && (
        <div className="flex items-center justify-center pt-20">
          <div className="text-center space-y-2 p-8 border rounded-xl bg-card max-w-md">
            <p className="text-2xl">📡</p>
            <h2 className="text-lg font-bold">No travel data yet</h2>
            <p className="text-sm text-muted-foreground">
              Go to <a href="/admin" className="underline font-medium hover:text-foreground">/admin</a> to sync data from Notion.
            </p>
          </div>
        </div>
      )}
      <CalendarWrapper
        segments={segments}
        months={months}
        year={YEAR}
        flightAnalytics={flightAnalytics}
        visitedCountries={visitedCountries}
        monthInsights={monthInsights}
        yearSummary={yearSummary}
        mapsStats={mapsStats}
        heatmapData={heatmapData}
        riceRunDates={riceRunDates}
      />
    </main>
  );
}
