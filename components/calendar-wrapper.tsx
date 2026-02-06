"use client";

import { useState, useEffect } from "react";
import { CalendarDay, TravelSegment, FlightAnalytics, VisitedCountriesData } from "@/lib/types";
import { getCurrentSegment, getNextSegment } from "@/lib/calendar-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./header";
import { YearCalendar } from "./year-calendar";
import { Legend } from "./legend";
import { CountryStats } from "./country-stats";
import { FlightStats } from "./flight-stats";
import { CountryTracker } from "./country-tracker";
import { ThemeToggle } from "./theme-toggle";
import { AuthGate } from "./auth-gate";

interface CalendarWrapperProps {
  segments: TravelSegment[];
  months: CalendarDay[][];
  year: number;
  flightAnalytics: FlightAnalytics | null;
  visitedCountries: VisitedCountriesData | null;
}

export function CalendarWrapper({
  segments,
  months,
  year,
  flightAnalytics,
  visitedCountries,
}: CalendarWrapperProps) {
  const [highlightCountry, setHighlightCountry] = useState<string | null>(null);
  const [today, setToday] = useState<string>("");

  // Compute today client-side to avoid hydration mismatch
  useEffect(() => {
    const now = new Date();
    setToday(
      now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0")
    );
  }, []);

  const currentSegment = getCurrentSegment(segments);
  const next = getNextSegment(segments);

  const content = (
    <TooltipProvider>
      <ThemeToggle />

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <Header
          currentSegment={currentSegment}
          nextSegment={next?.segment ?? null}
          daysUntilNext={next?.daysUntil ?? null}
        />

        <div className="mb-8">
          <p className="text-center text-sm text-muted-foreground mb-6 font-medium tracking-widest">
            {year}
          </p>
          <YearCalendar
            year={year}
            months={months}
            today={today}
            highlightCountry={highlightCountry}
          />
        </div>

        <div className="mt-8 pt-6 border-t">
          <Legend
            segments={segments}
            highlightCountry={highlightCountry}
            onCountryClick={setHighlightCountry}
          />
        </div>

        <div className="mt-10 pt-6 border-t">
          <h2 className="text-center text-sm font-semibold text-muted-foreground mb-5 tracking-widest uppercase">
            {year} Travel Plans
          </h2>
          <CountryStats months={months} />
        </div>

        {/* 2. All-Time Flight Stats */}
        {flightAnalytics && (
          <div className="mt-10 pt-6 border-t">
            <h2 className="text-center text-sm font-semibold text-muted-foreground mb-1 tracking-widest uppercase">
              Flight Log
            </h2>
            <p className="text-center text-xs text-muted-foreground mb-5">
              {flightAnalytics.totalFlights} flights since 2022
            </p>
            <FlightStats analytics={flightAnalytics} />
          </div>
        )}

        {/* 3. All-Time Country Stats */}
        {visitedCountries && (
          <div className="mt-10 pt-6 border-t">
            <h2 className="text-center text-sm font-semibold text-muted-foreground mb-5 tracking-widest uppercase">
              Country Tracker
            </h2>
            <CountryTracker data={visitedCountries} />
          </div>
        )}

        {/* 4. Scratch Map */}
        <div className="mt-10 pt-6 border-t">
          <h2 className="text-center text-sm font-semibold text-muted-foreground mb-2 tracking-widest uppercase">
            Where Gio Has Been
          </h2>
          <p className="text-center text-xs text-muted-foreground mb-5">
            Interactive map of all countries visited.
          </p>
          <div className="rounded-xl overflow-hidden border bg-card">
            <iframe
              loading="lazy"
              src="https://share.skratch.world/sNEbrMo4UV/visited"
              className="w-full aspect-[4/3] sm:aspect-[16/10] border-0"
              title="Gio's Scratch Map — countries visited"
            />
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground space-y-1">
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
      </div>
    </TooltipProvider>
  );

  return <AuthGate>{content}</AuthGate>;
}
