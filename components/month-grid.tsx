"use client";

import { CalendarDay } from "@/lib/types";
import { getMonthShortName, getStartDayOfWeek } from "@/lib/calendar-utils";
import { DayCell } from "./day-cell";

interface MonthGridProps {
  monthIndex: number;
  year: number;
  days: CalendarDay[];
  today: string;
  highlightCountry: string | null;
}

export function MonthGrid({
  monthIndex,
  year,
  days,
  today,
  highlightCountry,
}: MonthGridProps) {
  const startDay = getStartDayOfWeek(year, monthIndex);

  return (
    <div>
      <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 sm:mb-2 tracking-wide uppercase">
        {getMonthShortName(monthIndex)}
      </h3>
      <div className="grid grid-cols-7 gap-[2px] sm:gap-[3px] lg:gap-[4px]">
        {/* Empty cells for offset */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] lg:w-[32px] lg:h-[32px]" />
        ))}
        {/* Day cells */}
        {days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            isToday={day.date === today}
            highlightCountry={highlightCountry}
          />
        ))}
      </div>
    </div>
  );
}
