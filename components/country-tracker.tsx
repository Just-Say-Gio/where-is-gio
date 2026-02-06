"use client";

import { VisitedCountriesData } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Marquee } from "@/components/ui/marquee";

interface CountryTrackerProps {
  data: VisitedCountriesData;
}

const TOTAL_COUNTRIES_WORLD = 195;

export function CountryTracker({ data }: CountryTrackerProps) {
  const { totalVisited, regions, allCodes } = data;
  const pctWorld = Math.round((totalVisited / TOTAL_COUNTRIES_WORLD) * 100);

  // Sort regions by visited count descending, filter out empty ones
  const regionsSorted = Object.entries(regions)
    .filter(([, r]) => r.total > 0)
    .sort((a, b) => b[1].visited - a[1].visited);

  // Region with highest completion %
  const topRegion = regionsSorted
    .filter(([, r]) => r.visited > 0)
    .sort((a, b) => (b[1].visited / b[1].total) - (a[1].visited / a[1].total))[0];

  // Country items for marquee
  const countryItems = allCodes.map((code) => {
    const info = getCountryInfo(code);
    return { flag: info.flag, name: info.name };
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hero: CircularProgressBar + count */}
      <BlurFade delay={0.05} inView>
        <MagicCard className="rounded-xl p-5" gradientColor="rgba(16,185,129,0.12)">
          <div className="flex items-center justify-center gap-5">
            <AnimatedCircularProgressBar
              value={pctWorld}
              max={100}
              min={0}
              gaugePrimaryColor="#10B981"
              gaugeSecondaryColor="rgba(16,185,129,0.15)"
              className="size-24 sm:size-28 text-xl sm:text-2xl shrink-0"
            />
            <div className="min-w-0">
              <p className="text-3xl sm:text-4xl font-bold">
                <NumberTicker value={totalVisited} />
                <span className="text-base sm:text-lg font-normal text-muted-foreground">/{TOTAL_COUNTRIES_WORLD}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                countries visited
              </p>
            </div>
          </div>
        </MagicCard>
      </BlurFade>

      {/* Regional breakdown */}
      <BlurFade delay={0.1} inView>
        <MagicCard className="rounded-xl p-4" gradientColor="rgba(59,130,246,0.10)">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
            By region
          </h3>
          <div className="space-y-2">
            {regionsSorted.map(([name, region]) => {
              const pct = region.visited > 0 ? Math.round((region.visited / region.total) * 100) : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {region.visited}/{region.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </MagicCard>
      </BlurFade>

      {/* Country Marquee */}
      <BlurFade delay={0.15} inView>
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent" />
          <Marquee pauseOnHover className="[--duration:35s] [--gap:2rem]">
            {countryItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                <span>{item.flag}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </Marquee>
        </div>
      </BlurFade>

      {/* Fun fact badge */}
      {topRegion && (
        <BlurFade delay={0.2} inView>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5">
              <AnimatedShinyText className="text-xs sm:text-sm font-medium">
                Best explored: {topRegion[0]} ({Math.round((topRegion[1].visited / topRegion[1].total) * 100)}%)
              </AnimatedShinyText>
            </div>
          </div>
        </BlurFade>
      )}
    </div>
  );
}
