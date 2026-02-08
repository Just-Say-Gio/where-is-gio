"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Grid2x2, LayoutList, X, MessageCircle } from "lucide-react";
import { getMonthShortName, getStartDayOfWeek, getISOWeekNumber } from "@/lib/calendar-utils";

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type WhenLayout = "2col" | "1col";

interface WhenCalendarProps {
  year: number;
  thailandDates: string[];
  overrides: string[]; // dates that are unavailable
  riceRunDates?: string[];
}

/** Group sorted date strings into consecutive ranges */
function groupDatesIntoRanges(dates: string[]): { start: string; end: string }[] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const ranges: { start: string; end: string }[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(prev + "T00:00:00");
    const currDate = new Date(sorted[i] + "T00:00:00");
    const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;

    if (diffDays === 1) {
      prev = sorted[i];
    } else {
      ranges.push({ start: rangeStart, end: prev });
      rangeStart = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push({ start: rangeStart, end: prev });
  return ranges;
}

/** Format a date range for display, e.g. "1-5 Mar" or "28 Mar - 3 Apr" */
function formatRange(range: { start: string; end: string }, year: number): string {
  const [, sm, sd] = range.start.split("-").map(Number);
  const [, em, ed] = range.end.split("-").map(Number);

  if (range.start === range.end) {
    return `${sd} ${MONTH_NAMES_SHORT[sm - 1]}`;
  }
  if (sm === em) {
    return `${sd}-${ed} ${MONTH_NAMES_SHORT[sm - 1]}`;
  }
  return `${sd} ${MONTH_NAMES_SHORT[sm - 1]} - ${ed} ${MONTH_NAMES_SHORT[em - 1]}`;
}

/** Build the WhatsApp message text */
function buildWhatsAppMessage(dates: string[], year: number): string {
  const ranges = groupDatesIntoRanges(dates);
  const rangeLines = ranges.map((r) => `• ${formatRange(r, year)}`).join("\n");
  const totalDays = dates.length;

  return [
    `Hey Gio! 👋`,
    ``,
    `I'd love to come visit you in Hua Hin! 🏖️`,
    ``,
    `I'm interested in these dates (${totalDays} day${totalDays !== 1 ? "s" : ""}):`,
    rangeLines,
    ``,
    `Let me know what works!`,
  ].join("\n");
}

const WA_PHONE = "31636551497";

function buildWhatsAppUrl(dates: string[], year: number): string {
  const text = buildWhatsAppMessage(dates, year);
  return `https://api.whatsapp.com/send/?phone=${WA_PHONE}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
}

export function WhenCalendar({ year, thailandDates, overrides, riceRunDates }: WhenCalendarProps) {
  const thSet = new Set(thailandDates);
  const overSet = new Set(overrides);
  const riceSet = useMemo(() => new Set(riceRunDates ?? []), [riceRunDates]);

  const [layout, setLayout] = useState<WhenLayout>("2col");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("when-calendar-layout");
    if (stored === "1col" || stored === "2col") setLayout(stored);
  }, []);

  const handleLayoutChange = useCallback((l: WhenLayout) => {
    setLayout(l);
    localStorage.setItem("when-calendar-layout", l);
  }, []);

  const toggleDate = useCallback((dateStr: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

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

  // Available dates = in Thailand AND not overridden
  const availableSet = useMemo(() => {
    const s = new Set<string>();
    for (const d of thailandDates) {
      if (!overSet.has(d)) s.add(d);
    }
    return s;
  }, [thailandDates, overSet]);

  const expanded = layout === "1col";
  const selectedCount = selected.size;

  // Summary for the floating bar
  const selectionSummary = useMemo(() => {
    if (selectedCount === 0) return "";
    const ranges = groupDatesIntoRanges(Array.from(selected));
    return ranges.map((r) => formatRange(r, year)).join(", ");
  }, [selected, selectedCount, year]);

  return (
    <div>
      {/* Instruction hint */}
      <p className="text-center text-xs text-muted-foreground/60 mb-3">
        Tap green dates to select, then send via WhatsApp
      </p>

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
              riceRunSet={riceSet}
              selectedSet={selected}
              availableSet={availableSet}
              onToggleDate={toggleDate}
              expanded={expanded}
            />
          </motion.div>
        ))}
      </div>

      {/* Spacer so floating bar doesn't cover last row */}
      <AnimatePresence>
        {selectedCount > 0 && <div className="h-24" />}
      </AnimatePresence>

      {/* Floating action bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-4 right-4 z-50 flex justify-center"
          >
            <div className="bg-background/95 backdrop-blur-md border border-border shadow-lg rounded-2xl px-4 py-3 max-w-md w-full">
              <div className="flex items-center gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {selectedCount} day{selectedCount !== 1 ? "s" : ""} selected
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectionSummary}
                  </p>
                </div>

                {/* Clear */}
                <button
                  onClick={clearSelection}
                  className="shrink-0 p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Clear selection"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>

                {/* WhatsApp button */}
                <a
                  href={buildWhatsAppUrl(Array.from(selected), year)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  riceRunSet,
  selectedSet,
  availableSet,
  onToggleDate,
  expanded,
}: {
  year: number;
  monthIndex: number;
  thailandSet: Set<string>;
  overrideSet: Set<string>;
  riceRunSet: Set<string>;
  selectedSet: Set<string>;
  availableSet: Set<string>;
  onToggleDate: (dateStr: string) => void;
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
              const isAvailable = availableSet.has(dateStr);
              const isSelected = selectedSet.has(dateStr);

              let cellClass = `${cellSize} ${cellSm} rounded-[3px] flex items-center justify-center ${cellFont} sm:text-[10px] font-medium relative transition-all `;

              if (!inThailand) {
                cellClass += "bg-muted/30 text-muted-foreground/30";
              } else if (isOverridden) {
                cellClass += "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30";
              } else if (isSelected) {
                cellClass += "bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500 ring-offset-1 ring-offset-background cursor-pointer";
              } else {
                cellClass += "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/25 active:scale-95";
              }

              return (
                <div
                  key={dateStr}
                  className={cellClass}
                  onClick={isAvailable ? () => onToggleDate(dateStr) : undefined}
                  role={isAvailable ? "button" : undefined}
                  tabIndex={isAvailable ? 0 : undefined}
                  onKeyDown={isAvailable ? (e) => { if (e.key === "Enter" || e.key === " ") onToggleDate(dateStr); } : undefined}
                >
                  {dayNum}
                  {isOverridden && (
                    <span className={`absolute inset-0 flex items-center justify-center text-red-500/60 ${crossSize} sm:text-[14px] font-bold`}>
                      ✕
                    </span>
                  )}
                  {riceRunSet.has(dateStr) && (
                    <span className={`absolute top-0 right-0 ${expanded ? "text-[8px]" : "text-[6px]"} sm:text-[7px] leading-none`}>🍚</span>
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
