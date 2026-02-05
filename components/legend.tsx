"use client";

import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";

interface LegendProps {
  segments: TravelSegment[];
  highlightCountry: string | null;
  onCountryClick: (code: string | null) => void;
}

export function Legend({
  segments,
  highlightCountry,
  onCountryClick,
}: LegendProps) {
  // Get unique countries in order of appearance
  const seen = new Set<string>();
  const countries: string[] = [];
  for (const seg of segments) {
    if (!seen.has(seg.countryCode)) {
      seen.add(seg.countryCode);
      countries.push(seg.countryCode);
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
      {countries.map((code) => {
        const info = getCountryInfo(code);
        const isActive = highlightCountry === code;

        return (
          <button
            key={code}
            onClick={() => onCountryClick(isActive ? null : code)}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
              transition-all duration-150 cursor-pointer
              border
              ${
                isActive
                  ? "border-foreground shadow-sm scale-105"
                  : "border-transparent hover:border-muted-foreground/30"
              }
              ${
                highlightCountry && !isActive
                  ? "opacity-40"
                  : "opacity-100"
              }
            `}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: info.color }}
            />
            <span>{info.flag}</span>
            <span>{info.name}</span>
          </button>
        );
      })}
    </div>
  );
}
