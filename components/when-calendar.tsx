"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Grid2x2, LayoutList } from "lucide-react";
import { getMonthShortName, getStartDayOfWeek, getISOWeekNumber } from "@/lib/calendar-utils";

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

type WhenLayout = "2col" | "1col";

interface WhenCalendarProps {
  year: number;
  thailandDates: string[];
  overrides: string[]; // dates that are unavailable
}

export function WhenCalendar({ year, thailandDates, overrides }: WhenCalendarProps) {
  const thSet = new Set(thailandDates);
  const overSet = new Set(overrides);

  const [layout, setLayout] = useState<WhenLayout>("2col");

  useEffect(() => {
    const stored = localStorage.getItem("when-calendar-layout");
    if (stored === "1col" || stored === "2col") setLayout(stored);
  }, []);

  const handleLayoutChange = useCallback((l: WhenLayout) => {
    setLayout(l);
    localStorage.setItem("when-calendar-layout", l);
  }, []);

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

  // Expanded = 1col on mobile (bigger cells)
  const expanded = layout === "1col";

  return (
    <div>
      {/* Layout toggle — mobile only */}
      <div className="flex justify-center mb-4 sm:hidden">
        <WhenLayoutToggle layout={layout} onLayoutChange={handleLayoutChange} />
      </div>

      <div
        className={`grid ${
          expanded ? "grid-cols-1" : "grid-cols-2"
        } sm:grid-cols-3 gap-4 sm:gap-8 justify-items-center`}
      >
        {monthsWithTH.map((monthIdx) => (
          <motion.div key={monthIdx} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <WhenMonth
              year={year}
              monthIndex={monthIdx}
              thailandSet={thSet}
              overrideSet={overSet}
              expanded={expanded}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---- Layout toggle (replicates CalendarLayoutToggle pattern) ---- */

const TOGGLE_OPTIONS: { value: WhenLayout; icon: typeof Grid2x2; label: string }[] = [
  { value: "2col", icon: Grid2x2, label: "2 columns" },
  { value: "1col", icon: LayoutList, label: "1 column" },
];

function WhenLayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: WhenLayout;
  onLayoutChange: (l: WhenLayout) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/50">
      {TOGGLE_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onLayoutChange(value)}
          className="relative z-10 flex items-center justify-center w-7 h-7 rounded-md transition-colors"
          aria-label={label}
          aria-pressed={layout === value}
        >
          {layout === value && (
            <motion.div
              layoutId="when-layout-indicator"
              className="absolute inset-0 rounded-md bg-background shadow-sm border border-border/30"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Icon
            size={14}
            className={`relative z-10 transition-colors ${
              layout === value ? "text-foreground" : "text-muted-foreground/60"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ---- Month component ---- */

function WhenMonth({
  year,
  monthIndex,
  thailandSet,
  overrideSet,
  expanded,
}: {
  year: number;
  monthIndex: number;
  thailandSet: Set<string>;
  overrideSet: Set<string>;
  expanded: boolean;
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

  // Mobile cell size: 22px compact, 32px expanded; always 28px at sm+
  const cellSize = expanded ? "w-[32px] h-[32px]" : "w-[22px] h-[22px]";
  const cellSm = "sm:w-[28px] sm:h-[28px]";
  const headerW = expanded ? "w-[32px]" : "w-[22px]";
  const weekW = expanded ? "w-[16px]" : "w-[12px]";
  const cellFont = expanded ? "text-[11px]" : "text-[9px]";
  const headerFont = expanded ? "text-[8px]" : "text-[7px]";
  const weekFont = expanded ? "text-[8px]" : "text-[7px]";
  const gap = expanded ? "gap-[3px]" : "gap-[2px]";
  const mbRow = expanded ? "mb-[3px]" : "mb-[2px]";
  const crossSize = expanded ? "text-[16px]" : "text-[12px]";

  return (
    <div>
      <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase">
        {getMonthShortName(monthIndex)}
      </h3>

      {/* Day headers */}
      <div className={`flex ${gap} sm:gap-[3px] mb-[2px]`}>
        <div className={`${weekW} sm:w-[16px] shrink-0`} />
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className={`${headerW} sm:w-[28px] h-[14px] flex items-center justify-center ${headerFont} sm:text-[8px] font-medium ${
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
          <div key={rowIdx} className={`flex ${gap} sm:gap-[3px] ${mbRow} sm:mb-[3px]`}>
            <div className={`${weekW} sm:w-[16px] shrink-0 flex items-center justify-center ${weekFont} sm:text-[8px] text-muted-foreground/40 font-medium`}>
              {weekNum}
            </div>
            {row.map((dateStr, cellIdx) => {
              if (!dateStr) {
                return <div key={`e-${cellIdx}`} className={`${cellSize} ${cellSm}`} />;
              }

              const dayNum = parseInt(dateStr.split("-")[2]);
              const inThailand = thailandSet.has(dateStr);
              const isOverridden = overrideSet.has(dateStr);

              let cellClass = `${cellSize} ${cellSm} rounded-[3px] flex items-center justify-center ${cellFont} sm:text-[10px] font-medium relative `;

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
                    <span className={`absolute inset-0 flex items-center justify-center text-red-500/60 ${crossSize} sm:text-[14px] font-bold`}>
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
