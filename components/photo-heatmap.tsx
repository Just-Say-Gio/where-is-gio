"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HeatmapData } from "@/lib/types";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";

// Dynamically import the Leaflet map (requires window/document)
const HeatmapMap = dynamic(() => import("./heatmap-map"), { ssr: false });

interface PhotoHeatmapProps {
  data: HeatmapData;
}

export function PhotoHeatmap({ data }: PhotoHeatmapProps) {
  return (
    <MagicCard className="rounded-xl p-4 sm:p-5" gradientColor="rgba(239,68,68,0.08)">
      {/* Hero stats */}
      <div className="grid grid-cols-4 gap-3 mb-4 text-center">
        <div>
          <p className="text-lg sm:text-2xl font-bold tabular-nums">
            <NumberTicker value={data.stats.totalVisits} />
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Tracked visits</p>
        </div>
        <div>
          <p className="text-lg sm:text-2xl font-bold tabular-nums">
            <NumberTicker value={data.stats.totalPhotos} />
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Geotagged photos</p>
        </div>
        <div>
          <p className="text-lg sm:text-2xl font-bold tabular-nums">
            <NumberTicker value={data.stats.totalPhotoViews} />
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Photo views</p>
        </div>
        <div>
          <p className="text-lg sm:text-2xl font-bold tabular-nums">
            <NumberTicker value={data.stats.totalReviews ?? 0} />
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Reviews</p>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-border/50">
        <HeatmapMap data={data} />
      </div>
    </MagicCard>
  );
}
