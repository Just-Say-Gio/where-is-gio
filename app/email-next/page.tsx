import { getCachedSegments } from "@/lib/cache";
import {
  getCurrentSegment,
  getCurrentTrip,
  getNextTrip,
  getMonthShortName,
} from "@/lib/calendar-utils";
import { getCountryInfo, resolveFlag } from "@/lib/countries";
import Link from "next/link";
import type { Trip } from "@/lib/calendar-utils";

export const metadata = {
  title: "Where Is Gio — Next Trip",
  description: "See where Gio is traveling next",
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const startMonth = getMonthShortName(start.getMonth());
  const endMonth = getMonthShortName(end.getMonth());
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

function TripCard({ trip, daysUntil, label }: { trip: Trip; daysUntil?: number; label: string }) {
  const firstInfo = getCountryInfo(trip.countries[0]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: firstInfo.color, borderLeftWidth: 4 }}
      >
        {/* Country flags row */}
        <div className="flex items-center gap-2 flex-wrap">
          {trip.countries.map((code, i) => {
            const info = getCountryInfo(code);
            const flag = resolveFlag(code);
            return (
              <div key={code} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-xs text-muted-foreground">→</span>
                )}
                <span className="text-2xl">{flag}</span>
                <span className="text-sm font-medium">{info.name}</span>
              </div>
            );
          })}
        </div>

        {/* Date range + duration + countdown */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <span className="font-medium">
              {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            <span className="text-muted-foreground">
              · {trip.totalDays} days
            </span>
          </div>
          {daysUntil !== undefined && daysUntil > 0 && (
            <span
              className="font-semibold"
              style={{ color: firstInfo.color }}
            >
              in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
            </span>
          )}
          {daysUntil === 0 && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: firstInfo.color }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: firstInfo.color }}
                />
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: firstInfo.color }}
              >
                right now
              </span>
            </div>
          )}
        </div>

        {/* Per-segment breakdown */}
        {trip.segments.length > 1 && (
          <div className="space-y-1.5 pt-1 border-t border-border/30">
            {trip.segments.map((seg, i) => {
              const info = getCountryInfo(seg.countryCode);
              const flag = resolveFlag(seg.countryCode, seg.city);
              const start = new Date(seg.startDate + "T00:00:00");
              const end = new Date(seg.endDate + "T00:00:00");
              const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span>{flag}</span>
                  <span className="font-medium text-foreground">
                    {seg.city || info.name}
                  </span>
                  <span>·</span>
                  <span>
                    {getMonthShortName(start.getMonth())} {start.getDate()}–{getMonthShortName(end.getMonth())} {end.getDate()}
                  </span>
                  <span>· {days}d</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailNextPage() {
  const segments = getCachedSegments();
  const currentSeg = segments ? getCurrentSegment(segments) : null;
  const currentTrip = segments ? getCurrentTrip(segments) : null;
  const nextTripData = segments ? getNextTrip(segments) : null;

  const homeInfo = getCountryInfo("TH");
  const isOnTrip = currentTrip && currentSeg && currentSeg.countryCode !== "TH";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Where Is Gio?
          </h1>
          <p className="text-sm text-muted-foreground">
            2026 Travel Calendar
          </p>
        </div>

        {/* Current location */}
        {isOnTrip ? (
          <TripCard trip={currentTrip!} daysUntil={0} label="Currently traveling" />
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Home base
            </p>
            <div
              className="rounded-xl border p-5 space-y-3"
              style={{ borderColor: homeInfo.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{homeInfo.flag}</span>
                <div>
                  <p className="text-xl font-bold">Thailand</p>
                  <p className="text-sm text-muted-foreground">Hua Hin</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Between trips — back home in Thailand
              </p>
            </div>
          </div>
        )}

        {/* Next trip */}
        {nextTripData && (
          <TripCard
            trip={nextTripData.trip}
            daysUntil={nextTripData.daysUntil}
            label="Next trip"
          />
        )}

        {/* CTA */}
        <div className="pt-4 space-y-3">
          <Link
            href="/"
            className="block w-full text-center py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            See Full Calendar &rarr;
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Login required to view the full 2026 travel calendar
          </p>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            whereisgio.live
          </p>
        </div>
      </div>
    </div>
  );
}
