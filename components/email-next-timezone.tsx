"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import {
  formatTime,
  getUtcOffset,
  formatOffset,
  getTimezoneLabel,
  IANA_TIMEZONES,
} from "@/lib/timezone";
import { MeetingPlanner } from "./meeting-planner";

interface EmailNextTimezoneProps {
  gioCountryCode: string;
}

interface TzRow {
  label: string;
  iana: string;
  emoji: string;
}

export function EmailNextTimezone({ gioCountryCode }: EmailNextTimezoneProps) {
  const [visitorTz, setVisitorTz] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!visitorTz) return null;

  const gioIana = IANA_TIMEZONES[gioCountryCode] ?? "Asia/Bangkok";
  const gioLabel = getTimezoneLabel(gioIana, gioCountryCode);
  const gioTime = formatTime(gioIana);
  const gioOffset = getUtcOffset(gioIana);

  // Fixed reference timezones
  const refTimezones: TzRow[] = [
    { label: "Mountain Time", iana: "America/Denver", emoji: "🏔️" },
    { label: "Amsterdam", iana: "Europe/Amsterdam", emoji: "🇳🇱" },
  ];

  // Add Thailand if Gio is NOT in Thailand
  if (gioCountryCode !== "TH") {
    refTimezones.push({ label: "Thailand", iana: "Asia/Bangkok", emoji: "🇹🇭" });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Timezone
      </p>
      <div className="rounded-xl border border-border/60 p-5 space-y-4">
        {/* Gio's current time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm text-muted-foreground">
              Gio&apos;s time
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold">{gioTime}</span>
            <span className="text-xs text-muted-foreground ml-1.5">
              {gioLabel}
            </span>
          </div>
        </div>

        {/* Reference timezone differences */}
        <div className="space-y-2.5 pt-2 border-t border-border/30">
          {refTimezones.map((tz) => {
            const refOffset = getUtcOffset(tz.iana);
            const diff = gioOffset - refOffset;
            const refTime = formatTime(tz.iana);
            const refLabel = getTimezoneLabel(tz.iana);

            return (
              <div key={tz.iana} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{tz.emoji}</span>
                  <span className="text-muted-foreground">{tz.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{refTime}</span>
                  <span className="text-xs text-muted-foreground">{refLabel}</span>
                  <span className={`text-xs font-semibold ${Math.abs(diff) < 0.5 ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {Math.abs(diff) < 0.5 ? "same" : formatOffset(diff)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meeting planner trigger */}
        <div className="pt-2 border-t border-border/30">
          <MeetingPlanner gioCountryCode={gioCountryCode} visitorTz={visitorTz}>
            <button
              className="group flex items-center gap-1.5 justify-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full py-1.5"
              aria-label="Open meeting planner"
            >
              <span>Plan a meeting with Gio</span>
              <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
            </button>
          </MeetingPlanner>
        </div>
      </div>
    </div>
  );
}
