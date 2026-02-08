"use client";

import { forwardRef } from "react";
import { CalendarDay } from "@/lib/types";
import { getCountryInfo, resolveFlag, UNKNOWN_COLOR } from "@/lib/countries";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface DayCellProps {
  day: CalendarDay;
  isToday: boolean;
  highlightCountry: string | null;
  expanded?: boolean;
  riceRunDates?: Set<string>;
}

function getTripDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  placeholder: "Tentative",
  transit: "Transit",
  option: "Option",
};

/** Check if a date string (YYYY-MM-DD) is in the past */
function isDatePast(dateStr: string): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(dateStr + "T00:00:00");
  return date < today;
}

// forwardRef so Radix asChild can attach refs directly — no wrapper div needed
const DayCellVisual = forwardRef<HTMLDivElement, DayCellProps & React.HTMLAttributes<HTMLDivElement>>(
  function DayCellVisual({ day, isToday, highlightCountry, expanded = false, riceRunDates, className, ...rest }, ref) {
    const segment = day.segment;
    const countryInfo = segment ? getCountryInfo(segment.countryCode) : null;
    const bgColor = countryInfo ? countryInfo.color : UNKNOWN_COLOR;
    const flag = segment ? resolveFlag(segment.countryCode, segment.city) : null;
    const isRiceRun = riceRunDates?.has(day.date) ?? false;

    const isDimmed =
      highlightCountry !== null &&
      segment?.countryCode !== highlightCountry;

    // Past dates are always treated as confirmed (no tentative/transit/option styling)
    const isPast = isDatePast(day.date);
    const status = isPast ? "confirmed" : (segment?.status || "confirmed");
    const isPlaceholder = status === "placeholder";
    const isTransit = status === "transit";
    const isOption = status === "option";

    return (
      <div
        ref={ref}
        className={`
          relative
          ${expanded ? "w-[32px] h-[32px]" : "w-[22px] h-[22px]"} sm:w-[26px] sm:h-[26px] lg:w-[32px] lg:h-[32px]
          rounded-[3px] cursor-default transition-all duration-150
          flex items-center justify-center overflow-hidden
          hover:scale-125 hover:z-10 hover:shadow-md
          ${isToday ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}
          ${isDimmed ? "opacity-20" : ""}
          ${isTransit ? "border border-dashed border-foreground/30" : ""}
          ${isOption ? "opacity-60" : ""}
          ${className || ""}
        `}
        style={{ backgroundColor: isTransit ? "transparent" : bgColor }}
        {...rest}
      >
        {isPlaceholder && segment && (
          <div
            className="absolute inset-0 rounded-[3px] pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.12) 2px,
                rgba(0,0,0,0.12) 4px
              )`,
            }}
          />
        )}
        {isTransit && countryInfo && flag && (
          <div
            className={`absolute ${expanded ? "inset-[5px]" : "inset-[3px]"} sm:inset-[4px] lg:inset-[5px] rounded-full flex items-center justify-center`}
            style={{ backgroundColor: bgColor }}
          >
            <span className={`${expanded ? "text-[12px]" : "text-[8px]"} sm:text-[10px] lg:text-[12px] leading-none select-none`}>
              {flag}
            </span>
          </div>
        )}
        {countryInfo && !isTransit && flag && (
          <span className={`relative z-10 ${expanded ? "text-[16px]" : "text-[10px]"} sm:text-[13px] lg:text-[16px] leading-none select-none`}>
            {flag}
          </span>
        )}
        {isRiceRun && (
          <span className={`absolute ${expanded ? "top-[1px] right-[1px] text-[10px]" : "top-0 right-0 text-[7px]"} sm:top-[1px] sm:right-[1px] sm:text-[8px] lg:text-[10px] leading-none z-20 drop-shadow-sm`}>
            🍚
          </span>
        )}
      </div>
    );
  }
);

function TooltipDetail({ day, isRiceRun }: { day: CalendarDay; isRiceRun?: boolean }) {
  const segment = day.segment;
  const countryInfo = segment ? getCountryInfo(segment.countryCode) : null;
  const flag = segment ? resolveFlag(segment.countryCode, segment.city) : null;
  const isPast = isDatePast(day.date);

  if (!segment || !countryInfo) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    );
  }

  const displayStatus = isPast ? "confirmed" : (segment.status || "confirmed");

  return (
    <div className="flex overflow-hidden rounded-md">
      <div className="w-1 shrink-0" style={{ backgroundColor: countryInfo.color }} />
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{flag}</span>
          <span className="text-xs font-semibold">{segment.city || segment.country}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{formatDateRange(segment.startDate, segment.endDate)}</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span>{getTripDuration(segment.startDate, segment.endDate)}d</span>
        </div>
        {displayStatus !== "confirmed" && (
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {STATUS_LABELS[displayStatus] || displayStatus}
          </span>
        )}
        {segment.notes && (
          <p className="text-[11px] text-muted-foreground italic leading-tight">
            {segment.notes}
          </p>
        )}
        {isRiceRun && (
          <div className="flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px]">🍚</span>
            <a
              href="https://charityriceruns.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-amber-700 dark:text-amber-400 font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Charity Rice Run
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerDetail({ day, isRiceRun }: { day: CalendarDay; isRiceRun?: boolean }) {
  const segment = day.segment;
  const countryInfo = segment ? getCountryInfo(segment.countryCode) : null;
  const flag = segment ? resolveFlag(segment.countryCode, segment.city) : null;
  const isPast = isDatePast(day.date);

  if (!segment || !countryInfo) {
    return (
      <div className="px-6 pb-6">
        <p className="text-sm text-muted-foreground">
          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">No travel planned</p>
      </div>
    );
  }

  const duration = getTripDuration(segment.startDate, segment.endDate);
  const displayStatus = isPast ? "confirmed" : (segment.status || "confirmed");

  return (
    <div className="px-6 pb-6 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
          style={{ backgroundColor: countryInfo.color + "20" }}
        >
          {flag}
        </div>
        <div>
          <p className="font-semibold text-sm">{segment.city || segment.country}</p>
          <p className="text-xs text-muted-foreground">{countryInfo.name}</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">{formatDateRange(segment.startDate, segment.endDate)}</p>
          <p>{duration} day{duration !== 1 ? "s" : ""}</p>
        </div>
        {displayStatus !== "confirmed" && (
          <div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[11px]">
              {STATUS_LABELS[displayStatus] || displayStatus}
            </span>
          </div>
        )}
      </div>
      {segment.notes && (
        <p className="text-xs text-muted-foreground italic border-l-2 pl-3" style={{ borderColor: countryInfo.color }}>
          {segment.notes}
        </p>
      )}
      {isRiceRun && (
        <a
          href="https://charityriceruns.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
        >
          <span className="text-lg">🍚</span>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Charity Rice Run</p>
            <p className="text-[10px] text-muted-foreground">Feeding 80+ children on the Thai-Myanmar border</p>
          </div>
        </a>
      )}
    </div>
  );
}

export function DayCell(props: DayCellProps) {
  const isMobile = useIsMobile();
  const { day, riceRunDates } = props;
  const isRiceRun = riceRunDates?.has(day.date) ?? false;

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <DayCellVisual {...props} />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-sm">
              {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </DrawerTitle>
          </DrawerHeader>
          <DrawerDetail day={day} isRiceRun={isRiceRun} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DayCellVisual {...props} />
      </TooltipTrigger>
      <TooltipContent side="top" className="p-0 max-w-[260px]">
        <TooltipDetail day={day} isRiceRun={isRiceRun} />
      </TooltipContent>
    </Tooltip>
  );
}
