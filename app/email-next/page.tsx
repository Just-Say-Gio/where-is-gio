import { getCachedSegments } from "@/lib/cache";
import {
  getCurrentSegment,
  getNextSegment,
  getMonthShortName,
} from "@/lib/calendar-utils";
import { getCountryInfo, resolveFlag } from "@/lib/countries";
import Link from "next/link";

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

function getDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00").getTime();
  const end = new Date(endDate + "T00:00:00").getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export default function EmailNextPage() {
  const segments = getCachedSegments();
  const current = segments ? getCurrentSegment(segments) : null;
  const next = segments ? getNextSegment(segments) : null;

  const currentInfo = current ? getCountryInfo(current.countryCode) : null;
  const currentFlag = current
    ? resolveFlag(current.countryCode, current.city)
    : null;

  const nextInfo = next ? getCountryInfo(next.segment.countryCode) : null;
  const nextFlag = next
    ? resolveFlag(next.segment.countryCode, next.segment.city)
    : null;

  // Default home info
  const homeInfo = getCountryInfo("TH");

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
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {current ? "Currently in" : "Home base"}
          </p>
          <div
            className="rounded-xl border p-5 space-y-3"
            style={{
              borderColor: currentInfo?.color ?? homeInfo.color,
              borderLeftWidth: 4,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">
                {currentFlag ?? homeInfo.flag}
              </span>
              <div>
                <p className="text-xl font-bold">
                  {current
                    ? current.city || current.country
                    : "Thailand"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {current
                    ? currentInfo?.name ?? current.country
                    : "Hua Hin"}
                </p>
              </div>
            </div>
            {current && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <span className="font-medium">
                    {formatDateRange(current.startDate, current.endDate)}
                  </span>
                  <span className="text-muted-foreground">
                    · {getDuration(current.startDate, current.endDate)} days
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="relative flex h-2 w-2"
                  >
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: currentInfo?.color }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: currentInfo?.color }}
                    />
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: currentInfo?.color }}
                  >
                    right now
                  </span>
                </div>
              </div>
            )}
            {!current && (
              <p className="text-sm text-muted-foreground">
                Between trips — back home in Thailand
              </p>
            )}
          </div>
        </div>

        {/* Next trip */}
        {next && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Next trip
            </p>
            <div
              className="rounded-xl border p-5 space-y-3"
              style={{
                borderColor: nextInfo?.color,
                borderLeftWidth: 4,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{nextFlag}</span>
                <div>
                  <p className="text-xl font-bold">
                    {next.segment.city || next.segment.country}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {nextInfo?.name ?? next.segment.country}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <span className="font-medium">
                    {formatDateRange(
                      next.segment.startDate,
                      next.segment.endDate
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    · {getDuration(next.segment.startDate, next.segment.endDate)} days
                  </span>
                </div>
                <span
                  className="font-semibold"
                  style={{ color: nextInfo?.color }}
                >
                  in {next.daysUntil} day{next.daysUntil !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
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
