"use client";

import { useMemo } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

interface CharityRiceBannerProps {
  riceRunDates?: string[];
  compact?: boolean;
}

export function CharityRiceBanner({ riceRunDates, compact }: CharityRiceBannerProps) {
  const nextRun = useMemo(() => {
    if (!riceRunDates || riceRunDates.length === 0) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const future = riceRunDates
      .map((d) => new Date(d + "T00:00:00"))
      .filter((d) => d >= today)
      .sort((a, b) => a.getTime() - b.getTime());
    if (future.length === 0) return null;
    return future[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [riceRunDates]);

  const totalRuns = riceRunDates?.length ?? 0;

  if (compact) {
    return (
      <a
        href="https://charityriceruns.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15 hover:bg-amber-500/15 transition-colors"
      >
        <span className="text-base">🍚</span>
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-amber-700 dark:text-amber-400">Charity Rice Runs</span>
          {" "}&middot; Feeding 80+ children on the Thai-Myanmar border
        </span>
      </a>
    );
  }

  return (
    <MagicCard gradientColor="rgba(217,119,6,0.08)" className="p-3 sm:p-4">
      <a
        href="https://charityriceruns.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 group"
      >
        <span className="text-2xl shrink-0">🍚</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <AnimatedShinyText className="text-xs font-semibold">
              Charity Rice Runs
            </AnimatedShinyText>
            {nextRun && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                Next: {nextRun}
              </span>
            )}
            {!nextRun && totalRuns > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                {totalRuns} run{totalRuns !== 1 ? "s" : ""} completed
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            Feeding 80+ children at two orphan homes on the Thai-Myanmar border
          </p>
        </div>
        <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors text-xs shrink-0">
          &rarr;
        </span>
      </a>
    </MagicCard>
  );
}
