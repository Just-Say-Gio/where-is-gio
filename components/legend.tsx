"use client";

import { useMemo } from "react";
import { CalendarDay, TravelSegment } from "@/lib/types";
import { getCountryInfo, resolveFlag } from "@/lib/countries";

interface LegendProps {
  segments: TravelSegment[];
  months: CalendarDay[][];
  highlightCountry: string | null;
  onCountryClick: (code: string | null) => void;
}

export function Legend({
  segments,
  months,
  highlightCountry,
  onCountryClick,
}: LegendProps) {
  // Compute day counts per country from resolved calendar data
  const countriesWithCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    const cityMap = new Map<string, string>(); // first city per country code
    for (const month of months) {
      for (const day of month) {
        if (day.segment) {
          const code = day.segment.countryCode;
          countMap.set(code, (countMap.get(code) || 0) + 1);
          if (!cityMap.has(code) && day.segment.city) {
            cityMap.set(code, day.segment.city);
          }
        }
      }
    }
    // Sort by day count descending
    return [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, days]) => ({ code, days, city: cityMap.get(code) }));
  }, [months]);

  return (
    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
      {countriesWithCounts.map(({ code, days, city }) => {
        const info = getCountryInfo(code);
        const flag = resolveFlag(code, city);
        const isActive = highlightCountry === code;

        return (
          <button
            key={code}
            onClick={() => onCountryClick(isActive ? null : code)}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs font-medium
              transition-all duration-150 cursor-pointer
              border
              ${
                isActive
                  ? "border-foreground/50 scale-105"
                  : "border-transparent hover:border-muted-foreground/30"
              }
              ${
                highlightCountry && !isActive
                  ? "opacity-40"
                  : "opacity-100"
              }
            `}
            style={isActive ? { boxShadow: `0 0 12px ${info.color}40` } : undefined}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: info.color }}
            />
            <span>{flag}</span>
            <span>{info.name}</span>
            <span className="text-muted-foreground/60 text-[10px] font-normal">{days}d</span>
          </button>
        );
      })}
    </div>
  );
}
