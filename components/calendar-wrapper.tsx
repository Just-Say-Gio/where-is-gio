"use client";

import { useState, useEffect } from "react";
import { CalendarDay, TravelSegment } from "@/lib/types";
import { getCurrentSegment, getNextSegment } from "@/lib/calendar-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./header";
import { YearCalendar } from "./year-calendar";
import { Legend } from "./legend";
import { CountryStats } from "./country-stats";
import { ThemeToggle } from "./theme-toggle";

interface CalendarWrapperProps {
  segments: TravelSegment[];
  months: CalendarDay[][];
  year: number;
}

export function CalendarWrapper({
  segments,
  months,
  year,
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

  return (
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
            Travel Stats
          </h2>
          <CountryStats segments={segments} />
        </div>

        <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground space-y-1">
          <p>
            Data synced from Notion &middot; Updated every 6 hours
          </p>
          <p className="opacity-50">
            Made with coffee and curiosity
          </p>
        </footer>
      </div>
    </TooltipProvider>
  );
}
