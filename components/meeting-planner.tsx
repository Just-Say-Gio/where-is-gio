"use client";

import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  generateMeetingGrid,
  findBestWindow,
  getTimeDifference,
  formatHour,
  formatOffset,
  getTimezoneLabel,
  IANA_TIMEZONES,
  type MeetingHour,
  type HourQuality,
} from "@/lib/timezone";

interface MeetingPlannerProps {
  gioCountryCode: string;
  visitorTz: string;
  children: React.ReactNode;
}

export function MeetingPlanner({
  gioCountryCode,
  visitorTz,
  children,
}: MeetingPlannerProps) {
  const isMobile = useIsMobile();

  const content = (
    <MeetingGrid gioCountryCode={gioCountryCode} visitorTz={visitorTz} />
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-sm font-semibold">
              Meeting Planner
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center" sideOffset={8}>
        <div className="p-4">{content}</div>
      </PopoverContent>
    </Popover>
  );
}

// --- Meeting Grid Content ---

const QUALITY_COLORS: Record<HourQuality, string> = {
  good: "bg-emerald-500/70 dark:bg-emerald-400/50",
  okay: "bg-amber-400/60 dark:bg-amber-300/40",
  bad: "bg-muted/40",
};

function MeetingGrid({
  gioCountryCode,
  visitorTz,
}: {
  gioCountryCode: string;
  visitorTz: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const diff = useMemo(
    () => getTimeDifference(gioCountryCode, visitorTz),
    [gioCountryCode, visitorTz]
  );
  const isSameZone = Math.abs(diff) < 0.5;

  const grid = useMemo(
    () => generateMeetingGrid(gioCountryCode, visitorTz),
    [gioCountryCode, visitorTz]
  );

  const bestWindow = useMemo(() => findBestWindow(grid), [grid]);

  const gioIana = IANA_TIMEZONES[gioCountryCode] ?? "Asia/Bangkok";
  const gioLabel = getTimezoneLabel(gioIana, gioCountryCode);
  const visitorLabel = getTimezoneLabel(visitorTz);

  // Group contiguous "good" and "okay" ranges for the detail list
  const goodRanges = useMemo(() => groupRanges(grid, "good"), [grid]);
  const okayRanges = useMemo(() => groupRanges(grid, "okay"), [grid]);

  if (isSameZone) {
    return (
      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Same timezone — any time works!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No time difference to worry about.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommendation banner */}
      {bestWindow && (
        <div
          className={`rounded-lg p-3 ${
            bestWindow.quality === "good"
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-amber-500/10 border border-amber-500/20"
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              bestWindow.quality === "good"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {bestWindow.quality === "good"
              ? "Best time to meet"
              : "Best compromise"}
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {formatHour(bestWindow.startGio)} – {formatHour(bestWindow.endGio)}{" "}
            <span className="text-muted-foreground font-normal">
              (Gio · {gioLabel})
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatHour(bestWindow.startVisitor)} –{" "}
            {formatHour(bestWindow.endVisitor)}{" "}
            <span>(You · {visitorLabel})</span>
          </p>
        </div>
      )}

      {/* Offset badge */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Gio is{" "}
          <span className="font-semibold text-foreground">
            {formatOffset(diff)}
          </span>{" "}
          {diff > 0 ? "ahead" : "behind"}
        </span>
        <span className="opacity-50">Tap hours for details</span>
      </div>

      {/* Visual 24-hour strip */}
      <div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 mb-1">
          <span>12a</span>
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>12a</span>
        </div>

        {/* Gio's label */}
        <p className="text-[9px] text-muted-foreground mb-0.5 font-medium">
          Gio ({gioLabel})
        </p>

        {/* Hour cells */}
        <div className="flex gap-[1px] rounded overflow-hidden">
          {grid.map((hour, idx) => (
            <button
              key={idx}
              className={`flex-1 h-6 sm:h-7 transition-all ${QUALITY_COLORS[hour.quality]} ${
                hoveredIdx === idx
                  ? "ring-1 ring-foreground/50 scale-y-110 z-10"
                  : ""
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() =>
                setHoveredIdx(hoveredIdx === idx ? null : idx)
              }
              aria-label={`${formatHour(hour.gioHour)} Gio / ${formatHour(hour.visitorHour)} You`}
            />
          ))}
        </div>

        {/* Visitor's label */}
        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
          You ({visitorLabel})
        </p>

        {/* Visitor's hour markers (shifted) */}
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 mt-0.5">
          <span>{formatHourShort(grid[0].visitorHour)}</span>
          <span>{formatHourShort(grid[6].visitorHour)}</span>
          <span>{formatHourShort(grid[12].visitorHour)}</span>
          <span>{formatHourShort(grid[18].visitorHour)}</span>
          <span>{formatHourShort((grid[23].visitorHour + 1) % 24)}</span>
        </div>
      </div>

      {/* Hover detail */}
      {hoveredIdx !== null && (
        <div className="text-center text-xs text-muted-foreground bg-muted/30 rounded-md py-1.5 px-2">
          <span className="font-medium text-foreground">
            {formatHour(grid[hoveredIdx].gioHour)}
          </span>{" "}
          Gio →{" "}
          <span className="font-medium text-foreground">
            {formatHour(grid[hoveredIdx].visitorHour)}
          </span>{" "}
          You
          <span
            className={`ml-1.5 inline-block w-2 h-2 rounded-full ${QUALITY_COLORS[grid[hoveredIdx].quality]}`}
          />
        </div>
      )}

      {/* Good/Okay ranges */}
      {goodRanges.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            Good times
          </p>
          {goodRanges.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {formatHour(r.startGio)}–{formatHour(r.endGio)} Gio →{" "}
              {formatHour(r.startVisitor)}–{formatHour(r.endVisitor)} You
            </p>
          ))}
        </div>
      )}

      {okayRanges.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1">
            Possible times
          </p>
          {okayRanges.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {formatHour(r.startGio)}–{formatHour(r.endGio)} Gio →{" "}
              {formatHour(r.startVisitor)}–{formatHour(r.endVisitor)} You
            </p>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center text-[9px] text-muted-foreground/60 pt-1 border-t border-border/30">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/70 dark:bg-emerald-400/50" />
          Good
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-amber-400/60 dark:bg-amber-300/40" />
          Possible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-muted/40" />
          Avoid
        </span>
      </div>
    </div>
  );
}

// --- Helpers ---

function formatHourShort(hour: number): string {
  if (hour === 0 || hour === 24) return "12a";
  if (hour === 12) return "12p";
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

interface TimeRange {
  startGio: number;
  endGio: number;
  startVisitor: number;
  endVisitor: number;
}

function groupRanges(grid: MeetingHour[], quality: HourQuality): TimeRange[] {
  const ranges: TimeRange[] = [];
  let start: number | null = null;

  for (let i = 0; i < grid.length; i++) {
    const isMatch =
      quality === "okay"
        ? grid[i].quality === "okay"
        : grid[i].quality === quality;

    if (isMatch) {
      if (start === null) start = i;
    } else {
      if (start !== null) {
        ranges.push({
          startGio: grid[start].gioHour,
          endGio: (grid[i - 1].gioHour + 1) % 24,
          startVisitor: grid[start].visitorHour,
          endVisitor: (grid[i - 1].visitorHour + 1) % 24,
        });
        start = null;
      }
    }
  }
  if (start !== null) {
    ranges.push({
      startGio: grid[start].gioHour,
      endGio: (grid[grid.length - 1].gioHour + 1) % 24,
      startVisitor: grid[start].visitorHour,
      endVisitor: (grid[grid.length - 1].visitorHour + 1) % 24,
    });
  }

  return ranges;
}
