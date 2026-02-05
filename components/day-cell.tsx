"use client";

import { CalendarDay } from "@/lib/types";
import { getCountryInfo, UNKNOWN_COLOR } from "@/lib/countries";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayCellProps {
  day: CalendarDay;
  isToday: boolean;
  highlightCountry: string | null;
}

export function DayCell({ day, isToday, highlightCountry }: DayCellProps) {
  const segment = day.segment;
  const countryInfo = segment ? getCountryInfo(segment.countryCode) : null;
  const bgColor = countryInfo ? countryInfo.color : UNKNOWN_COLOR;

  const isDimmed =
    highlightCountry !== null &&
    segment?.countryCode !== highlightCountry;

  const formatDateRange = () => {
    if (!segment) return day.date;
    const start = new Date(segment.startDate + "T00:00:00");
    const end = new Date(segment.endDate + "T00:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`
            w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] lg:w-[32px] lg:h-[32px]
            rounded-[3px] cursor-default transition-all duration-150
            flex items-center justify-center overflow-hidden
            hover:scale-125 hover:z-10 hover:shadow-md
            ${isToday ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}
            ${isDimmed ? "opacity-20" : ""}
          `}
          style={{ backgroundColor: bgColor }}
        >
          {countryInfo && (
            <span className="text-[10px] sm:text-[13px] lg:text-[16px] leading-none select-none">
              {countryInfo.flag}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <div className="text-xs space-y-0.5">
          {segment ? (
            <>
              <p className="font-semibold">
                {countryInfo?.flag} {segment.city || segment.country}
              </p>
              <p className="text-muted">{formatDateRange()}</p>
              {segment.notes && (
                <p className="text-muted italic">{segment.notes}</p>
              )}
            </>
          ) : (
            <p>{day.date}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
