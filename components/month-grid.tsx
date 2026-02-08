"use client";

import { useMemo } from "react";
import { CalendarDay } from "@/lib/types";
import { getMonthShortName, getStartDayOfWeek, getISOWeekNumber } from "@/lib/calendar-utils";

import { DayCell } from "./day-cell";
import { TZ_OFFSETS } from "@/lib/timezone";

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

interface MonthGridProps {
  monthIndex: number;
  year: number;
  days: CalendarDay[];
  today: string;
  highlightCountry: string | null;
  insight: string | null;
  flightCount: number;
  expanded?: boolean;
  riceRunDates?: Set<string>;
}

export function MonthGrid({
  monthIndex,
  year,
  days,
  today,
  highlightCountry,
  insight,
  expanded = false,
  riceRunDates,
}: MonthGridProps) {
  const startDay = getStartDayOfWeek(year, monthIndex);

  // Always compute: countries, days abroad, timezone switches
  const displayStat = useMemo(() => {
    const countries = new Set<string>();
    let daysAbroad = 0;
    let tzSwitches = 0;
    let prevTz: number | null = null;

    for (const day of days) {
      const cc = day.segment?.countryCode ?? "TH"; // no segment = home (Thailand)
      countries.add(cc);
      if (cc !== "TH") daysAbroad++;

      const tz = TZ_OFFSETS[cc] ?? 7;
      if (prevTz !== null && tz !== prevTz) tzSwitches++;
      prevTz = tz;
    }

    const n = countries.size;
    const parts: string[] = [];

    parts.push(`${n} ${n === 1 ? "country" : "countries"}`);

    if (daysAbroad === 0) {
      parts.push("all home");
    } else if (daysAbroad === days.length) {
      parts.push("all abroad");
    } else {
      parts.push(`${daysAbroad}d abroad`);
    }

    if (tzSwitches > 0) {
      parts.push(`${tzSwitches} tz`);
    }

    return parts.join(" · ");
  }, [days]);

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
    <div id={`month-${monthIndex}`}>
      <div className="mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className={`${expanded ? "text-sm" : "text-xs"} sm:text-sm font-semibold text-muted-foreground tracking-wide uppercase`}>
            {getMonthShortName(monthIndex)}
          </h3>
          <span className={`${expanded ? "text-[9px]" : "text-[8px]"} sm:text-[9px] text-muted-foreground/50 font-medium tracking-wide`}>
            {displayStat}
          </span>
        </div>
        {insight && (
          <p className={`${expanded ? "text-[9px] max-w-full" : "text-[8px] max-w-[180px]"} sm:text-[9px] text-muted-foreground/40 italic truncate sm:max-w-[220px] lg:max-w-[260px]`}>
            {insight}
          </p>
        )}
      </div>

      {/* Header row: week number spacer + day-of-week labels */}
      <div className={`flex ${expanded ? "gap-[3px]" : "gap-[2px]"} sm:gap-[3px] lg:gap-[4px] mb-[2px]`}>
        <div className={`${expanded ? "w-[20px]" : "w-[16px]"} sm:w-[18px] lg:w-[20px] shrink-0`} />
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className={`${expanded ? "w-[32px] h-[18px]" : "w-[22px] h-[14px]"} sm:w-[26px] sm:h-[16px] lg:w-[32px] lg:h-[18px] flex items-center justify-center ${expanded ? "text-[10px]" : "text-[8px]"} sm:text-[9px] lg:text-[10px] font-medium ${
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
          <div key={rowIdx} className={`flex ${expanded ? "gap-[3px]" : "gap-[2px]"} sm:gap-[3px] lg:gap-[4px] ${expanded ? "mb-[3px]" : "mb-[2px]"} sm:mb-[3px] lg:mb-[4px]`}>
            {/* Week number */}
            <div className={`${expanded ? "w-[20px]" : "w-[16px]"} sm:w-[18px] lg:w-[20px] shrink-0 flex items-center justify-center ${expanded ? "text-[10px]" : "text-[8px]"} sm:text-[9px] lg:text-[10px] text-muted-foreground/40 font-medium`}>
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
                  expanded={expanded}
                  riceRunDates={riceRunDates}
                />
              ) : (
                <div
                  key={`empty-${rowIdx}-${cellIdx}`}
                  className={`${expanded ? "w-[32px] h-[32px]" : "w-[22px] h-[22px]"} sm:w-[26px] sm:h-[26px] lg:w-[32px] lg:h-[32px]`}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
