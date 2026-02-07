"use client";

import { useState } from "react";
import { MapsStatsData } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Marquee } from "@/components/ui/marquee";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface MapsStatsProps {
  stats: MapsStatsData;
}

const MODE_ICONS: Record<string, string> = {
  flying: "\u2708\uFE0F",
  driving: "\uD83D\uDE97",
  train: "\uD83D\uDE86",
  motorcycling: "\uD83C\uDFCD\uFE0F",
  ferry: "\u26F4\uFE0F",
  walking: "\uD83D\uDEB6",
  cycling: "\uD83D\uDEB2",
  bus: "\uD83D\uDE8C",
  subway: "\uD83D\uDE87",
  running: "\uD83C\uDFC3",
  tram: "\uD83D\uDE8B",
  skiing: "\u26F7\uFE0F",
  other: "\uD83D\uDCCD",
};

const MODE_COLORS: Record<string, string> = {
  flying: "#3B82F6",
  driving: "#F97316",
  train: "#10B981",
  motorcycling: "#EF4444",
  ferry: "#06B6D4",
  walking: "#8B5CF6",
  cycling: "#22C55E",
  bus: "#F59E0B",
  subway: "#6366F1",
  running: "#EC4899",
  tram: "#14B8A6",
  skiing: "#0EA5E9",
  other: "#9CA3AF",
};

function formatKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(km >= 10000 ? 0 : 1)}k`;
  return km.toLocaleString();
}

// ── Year card with hover-expanding transport mode bar + country flags ──

function YearCard({ ys }: { ys: MapsStatsData["yearlyStats"][number] }) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const modeEntries = Object.entries(ys.distanceByMode)
    .filter(([, km]) => km > 0)
    .sort(([, a], [, b]) => b - a);

  const countries = ys.countries ?? [];

  return (
    <MagicCard className="rounded-xl px-4 py-3" gradientColor="rgba(59,130,246,0.06)">
      {/* Header row: year · countries · km */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-bold tabular-nums">{ys.year}</span>
        {countries.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {countries.length} {countries.length === 1 ? "country" : "countries"}
          </span>
        )}
        <span className="text-xs font-semibold tabular-nums">
          {ys.totalKm.toLocaleString()} km
        </span>
      </div>

      {/* Country flags — bigger, two rows allowed */}
      {countries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {countries.map((code) => {
            const info = getCountryInfo(code);
            return (
              <Tooltip key={code}>
                <TooltipTrigger asChild>
                  <span className="text-base leading-none cursor-default">{info.flag}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{info.flag} {info.name}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Full-width transport mode bar with 70/30 hover expand */}
      <div
        className="h-5 sm:h-6 rounded-lg overflow-hidden flex gap-px bg-muted/30 mb-2.5"
        onMouseLeave={() => setHoveredMode(null)}
      >
        {modeEntries.map(([mode, km]) => {
          const pct = ys.totalKm > 0 ? (km / ys.totalKm) * 100 : 0;
          const isHovered = hoveredMode === mode;
          const hasHover = hoveredMode !== null;

          let w: number;
          if (!hasHover) {
            w = pct;
          } else if (isHovered) {
            w = 70;
          } else {
            const hoveredPct =
              ys.totalKm > 0
                ? ((ys.distanceByMode[hoveredMode!] ?? 0) / ys.totalKm) * 100
                : 0;
            w = hoveredPct < 100 ? (pct / (100 - hoveredPct)) * 30 : 0;
          }

          const icon = MODE_ICONS[mode] ?? "";

          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <div
                  className="h-full flex items-center justify-center px-1 cursor-pointer overflow-hidden first:rounded-l-lg last:rounded-r-lg"
                  style={{
                    width: `${w}%`,
                    minWidth: 3,
                    backgroundColor: isHovered
                      ? MODE_COLORS[mode] ?? "#9CA3AF"
                      : hasHover
                        ? `${MODE_COLORS[mode] ?? "#9CA3AF"}55`
                        : MODE_COLORS[mode] ?? "#9CA3AF",
                    opacity: hasHover && !isHovered ? 0.6 : 1,
                    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onMouseEnter={() => setHoveredMode(mode)}
                >
                  {isHovered ? (
                    <span className="text-white text-[10px] sm:text-xs font-medium drop-shadow-md truncate whitespace-nowrap">
                      {icon} {mode} &middot; {km.toLocaleString()} km &middot; {Math.round(pct)}%
                    </span>
                  ) : pct >= 8 ? (
                    <span className="text-[10px] drop-shadow-sm">{icon}</span>
                  ) : null}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>{icon} {mode}: {km.toLocaleString()} km ({Math.round(pct)}%)</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-[11px]">
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px]">{"\uD83D\uDCCD"}</span>
          <span><span className="font-semibold text-foreground">{ys.uniquePlaces.toLocaleString()}</span> places</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px]">{"\uD83D\uDCC5"}</span>
          <span><span className="font-semibold text-foreground">{ys.daysTracked}</span> days</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px]">{"\uD83D\uDE80"}</span>
          <span><span className="font-semibold text-foreground">{ys.kmPerDay.toLocaleString()}</span> km/d</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px]">{"\uD83C\uDF0D"}</span>
          <span><span className="font-semibold text-foreground">{ys.timezones}</span> tz</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px]">{"\uD83E\uDDF3"}</span>
          <span><span className="font-semibold text-foreground">{ys.trips}</span> trips</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px]">{MODE_ICONS[ys.topMode] ?? "\uD83D\uDE97"}</span>
          <span className="font-semibold text-foreground capitalize">{ys.topMode || "\u2014"}</span>
        </div>
      </div>
    </MagicCard>
  );
}

export function MapsStats({ stats }: MapsStatsProps) {
  const { distance, counts, yearlyStats, monthlyStats, records, reviews, photos, insights } = stats;

  // Flying vs ground percentage
  const flyingPct = distance.totalKm > 0 ? Math.round((distance.flying / distance.totalKm) * 100) : 0;

  // Distance modes sorted by km
  const modesSorted = (
    Object.entries(distance) as [string, number][]
  )
    .filter(([k, v]) => k !== "totalKm" && v > 0)
    .sort(([, a], [, b]) => b - a);

  // Years sorted descending
  const yearsSorted = [...yearlyStats].sort((a, b) => b.year - a.year);

  // Top months for marquee (sorted by km, top 20)
  const topMonths = [...monthlyStats]
    .filter((m) => m.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm)
    .slice(0, 20);

  // Years of data
  const yearsTracked = yearlyStats.length;

  // Top review countries
  const reviewCountriesSorted = reviews
    ? Object.entries(reviews.byCountry)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hero metrics */}
      <BlurFade delay={0.05} inView>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-xl mx-auto">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">
              <NumberTicker value={distance.totalKm} />
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">km total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">
              <NumberTicker value={counts.uniquePlaces} />
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Unique places</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">
              <NumberTicker value={counts.totalVisits} />
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Place visits</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">
              <NumberTicker value={yearsTracked} />
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Years of data</p>
          </div>
        </div>
      </BlurFade>

      {/* Flying vs Ground + Transport modes */}
      <BlurFade delay={0.1} inView>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(59,130,246,0.12)">
            <div className="flex items-center gap-4">
              <AnimatedCircularProgressBar
                value={flyingPct}
                max={100}
                min={0}
                gaugePrimaryColor="#3B82F6"
                gaugeSecondaryColor="rgba(59,130,246,0.15)"
                className="size-20 sm:size-24 text-lg sm:text-xl shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">
                  Air vs Ground
                </p>
                <p className="text-sm font-medium">
                  <NumberTicker value={flyingPct} />% by air
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {100 - flyingPct}% ground / water
                </p>
              </div>
            </div>
          </MagicCard>

          <MagicCard className="rounded-xl p-4" gradientColor="rgba(139,92,246,0.12)">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">
              Distance by Mode
            </p>
            <div className="space-y-1">
              {modesSorted.slice(0, 6).map(([mode, km]) => (
                <div key={mode} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="text-xs">{MODE_ICONS[mode] ?? ""}</span>
                    <span className="capitalize">{mode}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-xs">
                    {km.toLocaleString()} km
                  </span>
                </div>
              ))}
              {modesSorted.length > 6 && (
                <p className="text-[10px] text-muted-foreground pt-0.5">
                  +{modesSorted.length - 6} more modes
                </p>
              )}
            </div>
          </MagicCard>
        </div>
      </BlurFade>

      {/* Record cards */}
      <BlurFade delay={0.15} inView>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {records.busiestYear && (
            <MagicCard className="rounded-xl px-4 py-3 text-center" gradientColor="rgba(249,115,22,0.12)">
              <p className="text-xs text-muted-foreground mb-1">Busiest year</p>
              <p className="text-sm font-semibold">{records.busiestYear.year}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {records.busiestYear.distanceKm.toLocaleString()} km &middot;{" "}
                {records.busiestYear.visits.toLocaleString()} visits
              </p>
            </MagicCard>
          )}
          {records.longestFlight && (
            <MagicCard className="rounded-xl px-4 py-3 text-center" gradientColor="rgba(59,130,246,0.12)">
              <p className="text-xs text-muted-foreground mb-1">Longest flight</p>
              <p className="text-sm font-semibold">{records.longestFlight.distanceKm.toLocaleString()} km</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{records.longestFlight.date}</p>
            </MagicCard>
          )}
          {records.mostActiveDay && (
            <MagicCard className="rounded-xl px-4 py-3 text-center" gradientColor="rgba(16,185,129,0.12)">
              <p className="text-xs text-muted-foreground mb-1">Most active day</p>
              <p className="text-sm font-semibold">{records.mostActiveDay.activities} activities</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{records.mostActiveDay.date}</p>
            </MagicCard>
          )}
        </div>
      </BlurFade>

      {/* Year-by-year breakdown */}
      <BlurFade delay={0.2} inView>
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase text-center">
            Year by Year
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yearsSorted.map((ys) => (
              <YearCard key={ys.year} ys={ys} />
            ))}
          </div>
          {/* Mode color legend */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1">
            {modesSorted.slice(0, 6).map(([mode]) => (
              <div key={mode} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: MODE_COLORS[mode] }}
                />
                <span className="text-[10px] text-muted-foreground capitalize">{mode}</span>
              </div>
            ))}
          </div>
        </div>
      </BlurFade>

      {/* Reviews */}
      {reviews && reviews.total > 0 && (
        <BlurFade delay={0.25} inView>
          <MagicCard className="rounded-xl p-4" gradientColor="rgba(234,179,8,0.12)">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{"\u2B50"}</span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
                  Google Reviews
                </p>
                <p className="text-sm">
                  <span className="font-semibold"><NumberTicker value={reviews.total} /></span>{" "}
                  <span className="text-muted-foreground">
                    reviews across{" "}
                    <span className="font-semibold text-foreground"><NumberTicker value={reviews.countries} /></span>{" "}
                    countries
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {reviewCountriesSorted.map(([cc, count]) => (
                <div key={cc} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cc}</span>
                  <span className="font-semibold tabular-nums text-xs">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Avg rating: {reviews.avgRating.toFixed(1)} / 5</span>
              <span>
                {Object.entries(reviews.ratingDistribution)
                  .filter(([r]) => r !== "0")
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([r, c]) => `${r}\u2605:${c}`)
                  .join("  ")}
              </span>
            </div>
          </MagicCard>
        </BlurFade>
      )}

      {/* Photos summary */}
      {photos && photos.total > 0 && (
        <BlurFade delay={0.28} inView>
          <MagicCard className="rounded-xl px-4 py-3" gradientColor="rgba(139,92,246,0.12)">
            <div className="flex items-center gap-2">
              <span className="text-lg">{"\uD83D\uDCF7"}</span>
              <div className="text-sm">
                <span className="font-semibold"><NumberTicker value={photos.geotagged} /></span>{" "}
                <span className="text-muted-foreground">geotagged photos</span>
                {photos.dateRange && (
                  <span className="text-muted-foreground">
                    {" "}&middot; {photos.dateRange.start.slice(0, 4)}&ndash;{photos.dateRange.end.slice(0, 4)}
                  </span>
                )}
              </div>
            </div>
          </MagicCard>
        </BlurFade>
      )}

      {/* AI Insights */}
      {insights && insights.length > 0 && (
        <BlurFade delay={0.3} inView>
          <MagicCard className="rounded-xl p-4 sm:p-5" gradientColor="rgba(59,130,246,0.08)">
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-muted/30 px-2.5 py-0.5">
                <AnimatedShinyText className="text-[10px] font-medium">
                  {"\uD83E\uDDE0"} AI Deep Analysis
                </AnimatedShinyText>
              </div>
              <span className="text-[10px] text-muted-foreground/40">
                {insights.length} insights from {counts.totalDaysTracked.toLocaleString()} days of data
              </span>
            </div>
            {(() => {
              const categories = [
                { label: "Travel Personality", icon: "\uD83C\uDFAD", range: [0, 2] },
                { label: "Evolution", icon: "\uD83D\uDCC8", range: [2, 4] },
                { label: "Patterns", icon: "\uD83D\uDD0D", range: [4, 6] },
                { label: "Scale", icon: "\uD83C\uDF0D", range: [6, 8] },
                { label: "Deep Cuts", icon: "\uD83D\uDCA1", range: [8, 10] },
              ];
              // Only show categories if we have exactly 10 insights
              if (insights.length === 10) {
                return (
                  <div className="space-y-3">
                    {categories.map((cat) => {
                      const items = insights.slice(cat.range[0], cat.range[1]);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat.label}>
                          <p className="text-[10px] font-semibold text-muted-foreground/60 tracking-widest uppercase mb-1.5">
                            {cat.icon} {cat.label}
                          </p>
                          <ul className="space-y-1.5">
                            {items.map((insight, i) => (
                              <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-3 border-l-2 border-border/40">
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              // Fallback for non-10 counts: flat list
              return (
                <ul className="space-y-2">
                  {insights.map((insight, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-xs text-muted-foreground/50 mt-0.5 shrink-0">{i + 1}.</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </MagicCard>
        </BlurFade>
      )}

      {/* Monthly marquee */}
      {topMonths.length > 0 && (
        <BlurFade delay={0.35} inView>
          <Marquee pauseOnHover className="[--duration:35s]">
            {topMonths.map((m) => (
              <span
                key={m.month}
                className="mx-3 text-xs text-muted-foreground whitespace-nowrap"
              >
                {m.month} &middot; {formatKm(m.totalKm)} km &middot; {m.visits} visits
              </span>
            ))}
          </Marquee>
        </BlurFade>
      )}
    </div>
  );
}
