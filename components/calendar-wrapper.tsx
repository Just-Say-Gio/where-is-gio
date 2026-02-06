"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDay, TravelSegment, FlightAnalytics, VisitedCountriesData, YearSummary } from "@/lib/types";
import { getCurrentSegment, getNextSegment } from "@/lib/calendar-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BlurFade } from "@/components/ui/blur-fade";
import { Header } from "./header";
import { YearCalendar } from "./year-calendar";
import { Legend } from "./legend";
import { CountryStats } from "./country-stats";
import { FlightStats } from "./flight-stats";
import { CountryTracker } from "./country-tracker";
import { ThemeToggle } from "./theme-toggle";
import { CalendarLayoutToggle } from "./calendar-layout-toggle";
import { AuthGate } from "./auth-gate";
import { GioLocator } from "./gio-locator";

interface CalendarWrapperProps {
  segments: TravelSegment[];
  months: CalendarDay[][];
  year: number;
  flightAnalytics: FlightAnalytics | null;
  visitedCountries: VisitedCountriesData | null;
  monthInsights: string[] | null;
  yearSummary: YearSummary | null;
}

export function CalendarWrapper({
  segments,
  months,
  year,
  flightAnalytics,
  visitedCountries,
  monthInsights,
  yearSummary,
}: CalendarWrapperProps) {
  const [highlightCountry, setHighlightCountry] = useState<string | null>(null);
  const [today, setToday] = useState<string>("");
  const [calendarLayout, setCalendarLayout] = useState<"2col" | "1col">("2col");

  // Restore calendar layout preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("calendar-layout");
    if (stored === "1col" || stored === "2col") setCalendarLayout(stored);
  }, []);

  const handleLayoutChange = useCallback((layout: "2col" | "1col") => {
    setCalendarLayout(layout);
    localStorage.setItem("calendar-layout", layout);
  }, []);

  // Compute today client-side to avoid hydration mismatch
  useEffect(() => {
    const now = new Date();
    const todayStr =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");
    setToday(todayStr);

    // Auto-scroll to current month after a short delay (let animations start)
    const currentMonth = now.getMonth();
    setTimeout(() => {
      const el = document.getElementById(`month-${currentMonth}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
  }, []);

  const scrollToToday = useCallback(() => {
    const now = new Date();
    const el = document.getElementById(`month-${now.getMonth()}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Compute per-month 2026 flight counts
  const monthFlightCounts = useMemo(() => {
    if (!flightAnalytics) return null;
    const counts = new Array(12).fill(0);
    for (const f of flightAnalytics.flights) {
      const d = new Date(f.date + "T00:00:00");
      if (d.getFullYear() === year) {
        counts[d.getMonth()]++;
      }
    }
    return counts;
  }, [flightAnalytics, year]);

  const currentSegment = getCurrentSegment(segments);
  const next = getNextSegment(segments);

  const content = (
    <TooltipProvider>
      <ThemeToggle />

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <BlurFade delay={0.1} inView>
          <Header
            currentSegment={currentSegment}
            nextSegment={next?.segment ?? null}
            daysUntilNext={next?.daysUntil ?? null}
            year={year}
          />
        </BlurFade>

        {/* Calendar card */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 mb-8 overflow-x-auto">
          <div className="flex items-center justify-center mb-5 relative">
            <h2 className="text-center text-sm font-semibold text-muted-foreground tracking-widest uppercase">
              {year} at a Glance
            </h2>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <CalendarLayoutToggle layout={calendarLayout} onLayoutChange={handleLayoutChange} />
            </div>
          </div>
          <YearCalendar
            year={year}
            months={months}
            today={today}
            highlightCountry={highlightCountry}
            monthInsights={monthInsights}
            monthFlightCounts={monthFlightCounts}
            mobileLayout={calendarLayout}
          />
          <BlurFade delay={0.3} inView>
            <div className="mt-6 pt-5 border-t border-border/50">
              <Legend
                segments={segments}
                months={months}
                highlightCountry={highlightCountry}
                onCountryClick={setHighlightCountry}
              />
            </div>
          </BlurFade>
        </div>

        <BlurFade delay={0.15} inView>
          <div className="mt-10 pt-6 border-t">
            <h2 className="text-center text-sm font-semibold text-muted-foreground mb-5 tracking-widest uppercase">
              {year} Statistics
            </h2>
            <CountryStats months={months} yearSummary={yearSummary} />
          </div>
        </BlurFade>

        {/* GioLocator — radar distance widget + terminal init transition */}
        <BlurFade delay={0.15} inView>
          <div className="mt-10 pt-6 border-t">
            <GioLocator currentSegment={currentSegment} />
          </div>
        </BlurFade>

        {/* 2. All-Time Flight Stats */}
        {flightAnalytics && (
          <BlurFade delay={0.15} inView>
            <div className="mt-10 pt-6 border-t">
              <h2 className="text-center text-sm font-semibold text-muted-foreground mb-1 tracking-widest uppercase">
                Flight Log
              </h2>
              <p className="text-center text-xs text-muted-foreground mb-5">
                {flightAnalytics.totalFlights} flights since 2022
              </p>
              <FlightStats analytics={flightAnalytics} />
            </div>
          </BlurFade>
        )}

        {/* 3. All-Time Country Stats */}
        {visitedCountries && (
          <BlurFade delay={0.15} inView>
            <div className="mt-10 pt-6 border-t">
              <h2 className="text-center text-sm font-semibold text-muted-foreground mb-5 tracking-widest uppercase">
                Country Tracker
              </h2>
              <CountryTracker data={visitedCountries} />
            </div>
          </BlurFade>
        )}

        {/* 4. Scratch Map */}
        <BlurFade delay={0.15} inView>
          <div className="mt-10 pt-6 border-t">
            <h2 className="text-center text-sm font-semibold text-muted-foreground mb-2 tracking-widest uppercase">
              Where Gio Has Been
            </h2>
            <p className="text-center text-xs text-muted-foreground mb-5">
              Interactive map of all countries visited.
            </p>
            <div className="relative rounded-xl overflow-hidden border bg-card">
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30 animate-pulse">
                <span className="text-sm text-muted-foreground">Loading map...</span>
              </div>
              <iframe
                loading="lazy"
                src="https://share.skratch.world/sNEbrMo4UV/visited"
                className="relative z-10 w-full aspect-[4/3] sm:aspect-[16/10] border-0"
                title="Gio's Scratch Map — countries visited"
              />
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <footer className="mt-12 pt-6 pb-8 border-t text-center text-xs text-muted-foreground space-y-1">
            <p>
              Data synced from Notion &middot; Updated every 6 hours
            </p>
            <p>
              Made with ❤️ by{" "}
              <a
                href="https://giovannivandam.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                giovannivandam.com
              </a>
              {" "}with tech of{" "}
              <a
                href="https://gvdholdings.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                gvdholdings.com
              </a>
            </p>
          </footer>
        </BlurFade>
      </div>

      {/* Floating "Today" button */}
      <button
        onClick={scrollToToday}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:scale-105 transition-all duration-150 opacity-80 hover:opacity-100"
        aria-label="Scroll to today"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-background opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-background" />
        </span>
        Today
      </button>
    </TooltipProvider>
  );

  return <AuthGate>{content}</AuthGate>;
}
