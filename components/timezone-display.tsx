"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { TravelSegment } from "@/lib/types";
import {
  formatTime,
  getTimeDifference,
  formatOffset,
  getTimezoneLabel,
  IANA_TIMEZONES,
} from "@/lib/timezone";
import { MeetingPlanner } from "./meeting-planner";

interface TimezoneDisplayProps {
  currentSegment: TravelSegment | null;
}

export function TimezoneDisplay({ currentSegment }: TimezoneDisplayProps) {
  const [visitorTz, setVisitorTz] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Detect visitor timezone client-side
  useEffect(() => {
    setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Tick every 60s to keep times current
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!visitorTz) return null; // SSR or loading

  const gioCC = currentSegment?.countryCode ?? "TH";
  const gioIana = IANA_TIMEZONES[gioCC] ?? "Asia/Bangkok";
  const gioLabel = getTimezoneLabel(gioIana, gioCC);
  const gioTime = formatTime(gioIana);
  const visitorTime = formatTime(visitorTz);
  const visitorLabel = getTimezoneLabel(visitorTz);
  const diff = getTimeDifference(gioCC, visitorTz);
  const isSameZone = Math.abs(diff) < 0.5;

  return (
    <MeetingPlanner gioCountryCode={gioCC} visitorTz={visitorTz}>
      <button
        className="group flex items-center gap-1.5 justify-center text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full"
        aria-label="Open meeting planner"
      >
        <span>
          <span className="opacity-50">Gio:</span>{" "}
          <span className="font-medium text-foreground">{gioTime}</span>{" "}
          <span className="opacity-60">{gioLabel}</span>
        </span>

        {!isSameZone ? (
          <>
            <span className="opacity-30">·</span>
            <span>
              <span className="opacity-50">You:</span>{" "}
              <span className="font-medium text-foreground">{visitorTime}</span>{" "}
              <span className="opacity-60">{visitorLabel}</span>
            </span>
            <span className="opacity-30">·</span>
            <span className="font-semibold text-foreground">
              {formatOffset(diff)}
            </span>
          </>
        ) : (
          <>
            <span className="opacity-30">·</span>
            <span className="opacity-60">Same timezone!</span>
          </>
        )}

        <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
      </button>
    </MeetingPlanner>
  );
}
