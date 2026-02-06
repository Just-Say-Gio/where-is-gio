"use client";

import { getMonthShortName, getStartDayOfWeek, getISOWeekNumber } from "@/lib/calendar-utils";

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

interface WhenCalendarProps {
  year: number;
  thailandDates: string[];
  overrides: string[]; // dates that are unavailable
}

export function WhenCalendar({ year, thailandDates, overrides }: WhenCalendarProps) {
  const thSet = new Set(thailandDates);
  const overSet = new Set(overrides);

  // Only show months that have at least 1 Thailand date
  const monthsWithTH: number[] = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (thSet.has(ds)) {
        monthsWithTH.push(m);
        break;
      }
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 justify-items-center">
      {monthsWithTH.map((monthIdx) => (
        <WhenMonth
          key={monthIdx}
          year={year}
          monthIndex={monthIdx}
          thailandSet={thSet}
          overrideSet={overSet}
        />
      ))}
    </div>
  );
}

function WhenMonth({
  year,
  monthIndex,
  thailandSet,
  overrideSet,
}: {
  year: number;
  monthIndex: number;
  thailandSet: Set<string>;
  overrideSet: Set<string>;
}) {
  const startDay = getStartDayOfWeek(year, monthIndex);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Build date strings for this month
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  // Build rows
  const cells: (string | null)[] = [
    ...Array.from({ length: startDay }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">
        {getMonthShortName(monthIndex)}
      </h3>

      {/* Day headers */}
      <div className="flex gap-[3px] mb-[2px]">
        <div className="w-[16px] shrink-0" />
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className={`w-[28px] h-[14px] flex items-center justify-center text-[8px] font-medium ${
              i >= 5 ? "text-muted-foreground/50" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {rows.map((row, rowIdx) => {
        const firstDay = row.find((c) => c !== null);
        const weekNum = firstDay ? getISOWeekNumber(firstDay) : null;

        return (
          <div key={rowIdx} className="flex gap-[3px] mb-[3px]">
            <div className="w-[16px] shrink-0 flex items-center justify-center text-[8px] text-muted-foreground/40 font-medium">
              {weekNum}
            </div>
            {row.map((dateStr, cellIdx) => {
              if (!dateStr) {
                return <div key={`e-${cellIdx}`} className="w-[28px] h-[28px]" />;
              }

              const dayNum = parseInt(dateStr.split("-")[2]);
              const inThailand = thailandSet.has(dateStr);
              const isOverridden = overrideSet.has(dateStr);

              let cellClass = "w-[28px] h-[28px] rounded-[3px] flex items-center justify-center text-[10px] font-medium relative ";

              if (!inThailand) {
                cellClass += "bg-muted/30 text-muted-foreground/30";
              } else if (isOverridden) {
                cellClass += "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30";
              } else {
                cellClass += "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
              }

              return (
                <div key={dateStr} className={cellClass}>
                  {dayNum}
                  {isOverridden && (
                    <span className="absolute inset-0 flex items-center justify-center text-red-500/60 text-[14px] font-bold">
                      ✕
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
