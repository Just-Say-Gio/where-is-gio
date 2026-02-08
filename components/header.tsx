"use client";

import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { MagicCard } from "@/components/ui/magic-card";
import { TimezoneDisplay } from "./timezone-display";
import { useFriend } from "@/lib/friend-context";

interface HeaderProps {
  currentSegment: TravelSegment | null;
  nextSegment: TravelSegment | null;
  daysUntilNext: number | null;
  year: number;
}

export function Header({ currentSegment, nextSegment, daysUntilNext, year }: HeaderProps) {
  const { displayName } = useFriend();
  const countryInfo = currentSegment
    ? getCountryInfo(currentSegment.countryCode)
    : null;

  const nextCountryInfo = nextSegment
    ? getCountryInfo(nextSegment.countryCode)
    : null;

  // Dynamic gradient colors based on current + next country
  const gradientFrom = countryInfo?.color ?? "#F97316";
  const gradientTo = nextCountryInfo?.color ?? "#3B82F6";

  // MagicCard glow uses current country color at low opacity
  const cardGlow = countryInfo
    ? countryInfo.color + "20"
    : "rgba(249,115,22,0.12)";

  return (
    <header className="text-center py-8 md:py-12 space-y-4">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        <AnimatedGradientText
          colorFrom={gradientFrom}
          colorTo={gradientTo}
          speed={2}
          className="text-4xl md:text-5xl font-bold tracking-tight"
        >
          Where Is Gio?
        </AnimatedGradientText>
      </h1>

      {/* Personalized greeting */}
      {displayName && (
        <p className="text-sm text-muted-foreground">
          Hey <span className="font-medium text-foreground">{displayName}</span> 👋
        </p>
      )}

      {/* Year badge with shimmer */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-muted/30 px-3 py-1">
          <AnimatedShinyText className="text-xs font-medium">
            ✈ {year} Travel Calendar
          </AnimatedShinyText>
        </div>
      </div>

      {/* Location card */}
      <div className="max-w-sm mx-auto">
        <MagicCard
          className="rounded-xl px-4 py-3 sm:px-6 sm:py-4"
          gradientColor={cardGlow}
        >
          <div className="space-y-1.5">
            {currentSegment && countryInfo ? (
              <p className="text-base md:text-lg text-muted-foreground">
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
              <p className="text-base md:text-lg text-muted-foreground">
                On the move!
              </p>
            )}

            {nextSegment && nextCountryInfo && daysUntilNext !== null && daysUntilNext > 0 && (
              <p className="text-sm text-muted-foreground">
                Next up: {nextCountryInfo.flag} {nextSegment.city || nextSegment.country} in <NumberTicker value={daysUntilNext} className="font-semibold text-foreground" /> day{daysUntilNext !== 1 ? "s" : ""}
              </p>
            )}

            {/* Timezone comparison + meeting planner trigger */}
            <div className="mt-2 pt-2 border-t border-border/20">
              <TimezoneDisplay currentSegment={currentSegment} />
            </div>
          </div>
        </MagicCard>
      </div>
    </header>
  );
}
