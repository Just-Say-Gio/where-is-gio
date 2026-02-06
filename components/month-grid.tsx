"use client";

import { CalendarDay } from "@/lib/types";
import { getMonthShortName, getStartDayOfWeek, getISOWeekNumber } from "@/lib/calendar-utils";
import { DayCell } from "./day-cell";

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

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

  // Build rows of 7 cells (with nulls for empty slots)
  const cells: (CalendarDay | null)[] = [
    ...Array.from({ length: startDay }, () => null),
    ...days,
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const rows: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 sm:mb-2 tracking-wide uppercase">
        {getMonthShortName(monthIndex)}
      </h3>

      {/* Header row: week number spacer + day-of-week labels */}
      <div className="flex gap-[2px] sm:gap-[3px] lg:gap-[4px] mb-[2px]">
        <div className="w-[16px] sm:w-[18px] lg:w-[20px] shrink-0" />
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className={`w-[22px] h-[14px] sm:w-[26px] sm:h-[16px] lg:w-[32px] lg:h-[18px] flex items-center justify-center text-[8px] sm:text-[9px] lg:text-[10px] font-medium ${
              i >= 5 ? "text-muted-foreground/50" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar rows with week numbers */}
      {rows.map((row, rowIdx) => {
        // Find first real day in this row for the week number
        const firstDay = row.find((c) => c !== null);
        const weekNum = firstDay ? getISOWeekNumber(firstDay.date) : null;

        return (
          <div key={rowIdx} className="flex gap-[2px] sm:gap-[3px] lg:gap-[4px] mb-[2px] sm:mb-[3px] lg:mb-[4px]">
            {/* Week number */}
            <div className="w-[16px] sm:w-[18px] lg:w-[20px] shrink-0 flex items-center justify-center text-[8px] sm:text-[9px] lg:text-[10px] text-muted-foreground/40 font-medium">
              {weekNum}
            </div>
            {/* Day cells */}
            {row.map((cell, cellIdx) =>
              cell ? (
                <DayCell
                  key={cell.date}
                  day={cell}
                  isToday={cell.date === today}
                  highlightCountry={highlightCountry}
                />
              ) : (
                <div
                  key={`empty-${rowIdx}-${cellIdx}`}
                  className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] lg:w-[32px] lg:h-[32px]"
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
