"use client";

import { CalendarDay } from "@/lib/types";
import { MonthGrid } from "./month-grid";

interface YearCalendarProps {
  year: number;
  months: CalendarDay[][];
  today: string;
  highlightCountry: string | null;
}

export function YearCalendar({
  year,
  months,
  today,
  highlightCountry,
}: YearCalendarProps) {
  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6 sm:gap-x-8 sm:gap-y-8 lg:gap-x-10 lg:gap-y-10">
        {months.map((monthDays, i) => (
          <MonthGrid
            key={i}
            monthIndex={i}
            year={year}
            days={monthDays}
            today={today}
            highlightCountry={highlightCountry}
          />
        ))}
      </div>
    </div>
  );
}
