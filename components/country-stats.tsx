"use client";

import { useState } from "react";
import { CalendarDay, YearSummary } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { TZ_OFFSETS } from "@/lib/timezone";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Marquee } from "@/components/ui/marquee";
import { BlurFade } from "@/components/ui/blur-fade";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface CountryStatsProps {
  months: CalendarDay[][];
  yearSummary: YearSummary | null;
}

export function CountryStats({ months, yearSummary }: CountryStatsProps) {
  const allDays = months.flat();
  const totalDaysInYear = allDays.length;

  // --- Data computation ---

  // First pass: count days per country from segments
  const countryDays = new Map<string, number>();
  let uncoveredDays = 0;

  for (const day of allDays) {
    if (!day.segment) {
      uncoveredDays++;
      continue;
    }
    const code = day.segment.countryCode;
    countryDays.set(code, (countryDays.get(code) || 0) + 1);
  }

  // Home base = country with most segment days
  const initialSorted = [...countryDays.entries()].sort((a, b) => b[1] - a[1]);
  const homeCode = initialSorted.length > 0 ? initialSorted[0][0] : null;

  // Unassigned days = home base
  if (homeCode && uncoveredDays > 0) {
    countryDays.set(homeCode, (countryDays.get(homeCode) || 0) + uncoveredDays);
  }

  const sorted = [...countryDays.entries()].sort((a, b) => b[1] - a[1]);
  const uniqueCountries = sorted.length;
  const homeDays = homeCode ? (countryDays.get(homeCode) || 0) : 0;
  const daysAbroad = totalDaysInYear - homeDays;

  // Count trips, longest/shortest trip, unique cities
  let trips = 0;
  let longestTripDays = 0;
  let longestTripCountry = "";
  let shortestTripDays = Infinity;
  let currentTripDays = 0;
  let currentTripCounts = new Map<string, number>();
  let wasAbroad = false;

  const allCities = new Set<string>();

  for (const day of allDays) {
    const code = day.segment?.countryCode ?? null;
    const abroad = code !== null && code !== homeCode;

    if (day.segment?.city) allCities.add(day.segment.city);

    if (abroad) {
      if (!wasAbroad) {
        if (currentTripDays > 0 && currentTripDays < shortestTripDays) {
          shortestTripDays = currentTripDays;
        }
        trips++;
        currentTripDays = 0;
        currentTripCounts = new Map();
      }
      currentTripDays++;
      currentTripCounts.set(code!, (currentTripCounts.get(code!) || 0) + 1);

      if (currentTripDays > longestTripDays) {
        longestTripDays = currentTripDays;
        longestTripCountry = [...currentTripCounts.entries()]
          .sort((a, b) => b[1] - a[1])[0]?.[0] || code!;
      }
    } else {
      if (wasAbroad && currentTripDays > 0 && currentTripDays < shortestTripDays) {
        shortestTripDays = currentTripDays;
      }
      currentTripDays = 0;
    }

    wasAbroad = abroad;
  }
  // Final trip if year ends abroad
  if (wasAbroad && currentTripDays > 0 && currentTripDays < shortestTripDays) {
    shortestTripDays = currentTripDays;
  }

  if (shortestTripDays === Infinity) shortestTripDays = 0;
  const avgTripDays = trips > 0 ? Math.round(daysAbroad / trips) : 0;

  // Longest home streak
  let longestHomeStreak = 0;
  let currentHomeStreak = 0;
  for (const day of allDays) {
    const code = day.segment?.countryCode ?? null;
    const atHome = code === null || code === homeCode;
    if (atHome) {
      currentHomeStreak++;
      if (currentHomeStreak > longestHomeStreak) longestHomeStreak = currentHomeStreak;
    } else {
      currentHomeStreak = 0;
    }
  }

  // Confirmed %
  let confirmedDays = 0;
  for (const day of allDays) {
    if (day.segment?.status === "confirmed") confirmedDays++;
  }
  const confirmedPct = totalDaysInYear > 0 ? Math.round((confirmedDays / totalDaysInYear) * 100) : 0;

  // Jet lag score: cumulative timezone shifts
  let jetLagScore = 0;
  let lastOffset: number | null = null;
  for (const day of allDays) {
    const code = day.segment?.countryCode ?? homeCode ?? "TH";
    const offset = TZ_OFFSETS[code] ?? 7;
    if (lastOffset !== null && offset !== lastOffset) {
      jetLagScore += Math.abs(offset - lastOffset);
    }
    lastOffset = offset;
  }
  jetLagScore = Math.round(jetLagScore);

  // Country transition chain (for timezone dot viz)
  const transitions: { code: string; offset: number }[] = [];
  let lastTransitionCode: string | null = null;
  for (const day of allDays) {
    const code = day.segment?.countryCode ?? homeCode ?? "TH";
    if (code !== lastTransitionCode) {
      transitions.push({ code, offset: TZ_OFFSETS[code] ?? 7 });
      lastTransitionCode = code;
    }
  }

  // Destinations for marquee (unique country+city combos)
  const destinations: { flag: string; label: string }[] = [];
  const seenDest = new Set<string>();
  for (const day of allDays) {
    if (!day.segment) continue;
    const key = `${day.segment.countryCode}-${day.segment.city || ""}`;
    if (seenDest.has(key)) continue;
    seenDest.add(key);
    const info = getCountryInfo(day.segment.countryCode);
    destinations.push({
      flag: info.flag,
      label: day.segment.city || info.name,
    });
  }

  // Abroad percentage for circular progress
  const abroadPct = totalDaysInYear > 0 ? Math.round((daysAbroad / totalDaysInYear) * 100) : 0;

  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Section 1: AI Personality Badge */}
      {yearSummary && (
        <BlurFade delay={0.05} inView>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5">
              <AnimatedShinyText className="text-sm sm:text-base font-semibold">
                {yearSummary.personality}
              </AnimatedShinyText>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {yearSummary.summary}
            </p>
          </div>
        </BlurFade>
      )}

      {/* Section 2: Key Metrics Row */}
      <BlurFade delay={0.1} inView>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={uniqueCountries} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Countries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={daysAbroad} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Days abroad</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={trips} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Trips</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold"><NumberTicker value={allCities.size} /></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Cities</p>
          </div>
        </div>
      </BlurFade>

      {/* Section 3: Bento MagicCard Grid */}
      <BlurFade delay={0.15} inView>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Nomad Meter */}
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(249,115,22,0.12)">
            <div className="flex items-center gap-4">
              <AnimatedCircularProgressBar
                value={abroadPct}
                max={100}
                min={0}
                gaugePrimaryColor="#F97316"
                gaugeSecondaryColor="rgba(249,115,22,0.15)"
                className="size-20 sm:size-24 text-lg sm:text-xl shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">
                  Nomad Meter
                </p>
                <p className="text-sm font-medium">
                  <NumberTicker value={daysAbroad} /> of {totalDaysInYear} days abroad
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {homeCode && <>{getCountryInfo(homeCode).flag} Home {homeDays}d</>}
                </p>
              </div>
            </div>
          </MagicCard>

          {/* Jet Lag Score */}
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(139,92,246,0.12)">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Jet Lag Score
            </p>
            <p className="text-2xl sm:text-3xl font-bold mb-2">
              +<NumberTicker value={jetLagScore} />
              <span className="text-sm font-normal text-muted-foreground">h</span>
            </p>
            {/* Timezone dot chain */}
            <div className="flex flex-wrap gap-1">
              {transitions.slice(0, 30).map((t, i) => {
                const info = getCountryInfo(t.code);
                return (
                  <div
                    key={i}
                    className="size-3 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: info.color }}
                    title={`${info.name} (UTC${t.offset >= 0 ? "+" : ""}${t.offset})`}
                  />
                );
              })}
              {transitions.length > 30 && (
                <span className="text-[10px] text-muted-foreground self-center ml-1">
                  +{transitions.length - 30}
                </span>
              )}
            </div>
          </MagicCard>

          {/* Travel Pace */}
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(16,185,129,0.12)">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Travel Pace
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg trip</span>
                <span className="font-semibold tabular-nums">{avgTripDays}d</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Longest</span>
                <span className="font-semibold tabular-nums">
                  {longestTripDays}d {longestTripCountry && getCountryInfo(longestTripCountry).flag}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shortest</span>
                <span className="font-semibold tabular-nums">{shortestTripDays}d</span>
              </div>
            </div>
          </MagicCard>

          {/* Home Sweet Home */}
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(59,130,246,0.12)">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Home Sweet Home
            </p>
            <div className="space-y-1.5">
              {homeCode && (
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <span>{getCountryInfo(homeCode).flag}</span>
                  <span>{getCountryInfo(homeCode).name}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Longest streak</span>
                <span className="font-semibold tabular-nums">{longestHomeStreak}d</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmed</span>
                <span className="font-semibold tabular-nums">{confirmedPct}%</span>
              </div>
            </div>
          </MagicCard>
        </div>
      </BlurFade>

      {/* Section 4: Country Distribution */}
      <BlurFade delay={0.2} inView>
        <div
          className="h-9 sm:h-11 rounded-xl overflow-hidden flex gap-px bg-muted/30"
          onMouseLeave={() => setHoveredCode(null)}
        >
          {sorted.map(([code, days]) => {
            const info = getCountryInfo(code);
            const pct = (days / totalDaysInYear) * 100;
            const isHovered = hoveredCode === code;
            const hasHover = hoveredCode !== null;

            let w: number;
            if (!hasHover) {
              w = pct;
            } else if (isHovered) {
              w = 70;
            } else {
              const hoveredPct = (countryDays.get(hoveredCode!)! / totalDaysInYear) * 100;
              w = (pct / (100 - hoveredPct)) * 30;
            }

            // Default: show flag on any segment ≥ 3%
            // Hover: only the hovered segment shows full details
            const showFlag = !hasHover && pct >= 3;

            return (
              <Tooltip key={code}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full flex items-center justify-center px-1 cursor-pointer overflow-hidden"
                    style={{
                      width: `${w}%`,
                      minWidth: 4,
                      backgroundColor: isHovered
                        ? info.color
                        : hasHover
                          ? `${info.color}55`
                          : info.color,
                      opacity: hasHover && !isHovered ? 0.6 : 1,
                      transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onMouseEnter={() => setHoveredCode(code)}
                  >
                    {isHovered ? (
                      <span className="text-white text-xs sm:text-sm font-medium drop-shadow-md truncate whitespace-nowrap">
                        {info.flag} {info.name} &middot; {days}d &middot; {Math.round(pct)}%
                      </span>
                    ) : showFlag ? (
                      <span className="text-sm sm:text-base drop-shadow-sm">{info.flag}</span>
                    ) : null}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{info.flag} {info.name} &middot; {days}d &middot; {Math.round(pct)}%{code === homeCode ? " &middot; home" : ""}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </BlurFade>

      {/* Section 5: Destination Marquee */}
      {destinations.length > 3 && (
        <BlurFade delay={0.25} inView>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent" />
            <Marquee pauseOnHover className="[--duration:30s] [--gap:2rem]">
              {destinations.map((dest, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                  <span>{dest.flag}</span>
                  <span>{dest.label}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </BlurFade>
      )}

      {/* Section 6: AI Fun Facts */}
      {yearSummary && yearSummary.funFacts.length > 0 && (
        <BlurFade delay={0.3} inView>
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(236,72,153,0.10)">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
              Fun Facts
            </p>
            <div className="space-y-2">
              {yearSummary.funFacts.map((fact, i) => {
                const emojis = ["\u2708\uFE0F", "\uD83C\uDF0D", "\uD83D\uDD70\uFE0F"];
                return (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    <span className="mr-1.5">{emojis[i] || "\u2728"}</span>
                    <span className="italic">{fact}</span>
                  </p>
                );
              })}
            </div>
          </MagicCard>
        </BlurFade>
      )}
    </div>
  );
}
