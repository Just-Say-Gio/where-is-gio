"use client";

import { CalendarDay } from "@/lib/types";
import { BlurFade } from "@/components/ui/blur-fade";
import { motion } from "motion/react";
import { MonthGrid } from "./month-grid";

interface YearCalendarProps {
  year: number;
  months: CalendarDay[][];
  today: string;
  highlightCountry: string | null;
  monthInsights: string[] | null;
  monthFlightCounts: number[] | null;
  mobileLayout?: "2col" | "1col";
}

export function YearCalendar({
  year,
  months,
  today,
  highlightCountry,
  monthInsights,
  monthFlightCounts,
  mobileLayout = "2col",
}: YearCalendarProps) {
  const isExpanded = mobileLayout === "1col";

  return (
    <div className="flex justify-center">
      <motion.div
        layout
        className={`grid ${isExpanded ? "grid-cols-1" : "grid-cols-2"} sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6 sm:gap-x-8 sm:gap-y-8 lg:gap-x-10 lg:gap-y-10`}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {months.map((monthDays, i) => (
          <BlurFade key={i} delay={0.05 * i} inView>
            <MonthGrid
              monthIndex={i}
              year={year}
              days={monthDays}
              today={today}
              highlightCountry={highlightCountry}
              insight={monthInsights?.[i] ?? null}
              flightCount={monthFlightCounts?.[i] ?? 0}
              expanded={isExpanded}
            />
          </BlurFade>
        ))}
      </motion.div>
    </div>
  );
}
