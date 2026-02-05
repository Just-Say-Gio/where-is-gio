"use client";

import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";

interface HeaderProps {
  currentSegment: TravelSegment | null;
  nextSegment: TravelSegment | null;
  daysUntilNext: number | null;
}

export function Header({ currentSegment, nextSegment, daysUntilNext }: HeaderProps) {
  const countryInfo = currentSegment
    ? getCountryInfo(currentSegment.countryCode)
    : null;

  const nextCountryInfo = nextSegment
    ? getCountryInfo(nextSegment.countryCode)
    : null;

  return (
    <header className="text-center py-8 md:py-12">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        Where Is Gio?
      </h1>

      <div className="mt-4 space-y-1">
        {currentSegment && countryInfo ? (
          <p className="text-lg md:text-xl text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: countryInfo.color }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: countryInfo.color }} />
              </span>
              Currently in: {countryInfo.flag}{" "}
              <span className="font-semibold text-foreground">
                {currentSegment.city || currentSegment.country}
              </span>
            </span>
          </p>
        ) : (
          <p className="text-lg md:text-xl text-muted-foreground">
            On the move!
          </p>
        )}

        {nextSegment && nextCountryInfo && daysUntilNext !== null && daysUntilNext > 0 && (
          <p className="text-sm text-muted-foreground">
            Next up: {nextCountryInfo.flag} {nextSegment.city || nextSegment.country} in {daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </header>
  );
}
