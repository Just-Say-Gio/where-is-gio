import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getCachedSegments } from "@/lib/cache";
import {
  getCurrentSegment,
  getNextTrip,
  getMonthShortName,
} from "@/lib/calendar-utils";
import { getCountryInfo, resolveFlag } from "@/lib/countries";
import { withApiLogging } from "@/lib/api-logger";
import { getUtcOffset, getTimezoneLabel, IANA_TIMEZONES } from "@/lib/timezone";
import type { Trip } from "@/lib/calendar-utils";

export const runtime = "nodejs";

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const startMonth = getMonthShortName(start.getMonth());
  const endMonth = getMonthShortName(end.getMonth());
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

function formatUtcOffset(hours: number): string {
  const sign = hours >= 0 ? "+" : "";
  return Number.isInteger(hours) ? `${sign}${hours}` : `${sign}${hours.toFixed(1)}`;
}

function formatDiffBehind(gioOffset: number, refOffset: number): string {
  const diff = Math.abs(gioOffset - refOffset);
  if (diff < 0.5) return "same time";
  const hours = Number.isInteger(diff) ? `${diff}` : diff.toFixed(1);
  return gioOffset > refOffset ? `${hours}h behind` : `${hours}h ahead`;
}

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme") === "light" ? "light" : "dark";

  const segments = getCachedSegments();
  const currentSeg = segments ? getCurrentSegment(segments) : null;
  const nextTripData = segments ? getNextTrip(segments) : null;

  const isDark = theme === "dark";
  const bg = isDark ? "#18181b" : "#ffffff";
  const fg = isDark ? "#fafafa" : "#18181b";
  const mutedFg = isDark ? "#a1a1aa" : "#71717a";
  const dimFg = isDark ? "#52525b" : "#a1a1aa";
  const labelFg = isDark ? "#71717a" : "#a1a1aa";
  const divider = isDark ? "#27272a" : "#e4e4e7";
  const accentBg = isDark ? "#27272a" : "#f4f4f5";

  // Current location
  const gioCC = currentSeg?.countryCode ?? "TH";
  const isAbroad = currentSeg && gioCC !== "TH";
  const countryInfo = getCountryInfo(gioCC);
  const homeInfo = getCountryInfo("TH");

  const locationFlag = isAbroad
    ? resolveFlag(gioCC, currentSeg.city)
    : homeInfo.flag;
  const locationName = isAbroad
    ? currentSeg.city || countryInfo.name
    : "Hua Hin, Thailand";
  const accentColor = isAbroad ? countryInfo.color : homeInfo.color;

  // Timezone info (static — offsets and abbreviations, no live times)
  const gioIana = IANA_TIMEZONES[gioCC] ?? "Asia/Bangkok";
  const gioOffset = getUtcOffset(gioIana);
  const gioLabel = getTimezoneLabel(gioIana, gioCC);
  const gioUtc = `UTC${formatUtcOffset(gioOffset)}`;

  const mtIana = "America/Denver";
  const mtOffset = getUtcOffset(mtIana);
  const mtLabel = getTimezoneLabel(mtIana);
  const mtDiff = formatDiffBehind(gioOffset, mtOffset);

  const amsIana = "Europe/Amsterdam";
  const amsOffset = getUtcOffset(amsIana);
  const amsLabel = getTimezoneLabel(amsIana);
  const amsDiff = formatDiffBehind(gioOffset, amsOffset);

  // Thailand (only if abroad)
  let thDiff: string | null = null;
  if (gioCC !== "TH") {
    const thOffset = getUtcOffset("Asia/Bangkok");
    thDiff = formatDiffBehind(gioOffset, thOffset);
  }

  // Next trip
  const hasNext = !!nextTripData;
  const height = hasNext ? 150 : 100;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          fontFamily: "system-ui, sans-serif",
          padding: "14px 20px",
          gap: 0,
        }}
      >
        {/* Top section: Location + timezone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Location row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Accent dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: accentColor,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 17, fontWeight: 700, color: fg }}>
              {locationFlag} {locationName}
            </span>
            {isAbroad && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: accentColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                traveling
              </span>
            )}
          </div>

          {/* Timezone row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: 18,
              fontSize: 11,
            }}
          >
            {/* Gio's timezone badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: accentBg,
                borderRadius: 4,
                padding: "2px 7px",
                gap: 4,
              }}
            >
              <span style={{ fontWeight: 600, color: fg }}>{gioLabel}</span>
              <span style={{ color: dimFg }}>{gioUtc}</span>
            </div>

            <span style={{ color: dimFg }}>·</span>
            <span style={{ color: mutedFg }}>
              🏔️ {mtLabel} {mtDiff}
            </span>
            <span style={{ color: dimFg }}>·</span>
            <span style={{ color: mutedFg }}>
              🇳🇱 {amsLabel} {amsDiff}
            </span>
            {thDiff && (
              <>
                <span style={{ color: dimFg }}>·</span>
                <span style={{ color: mutedFg }}>
                  🇹🇭 ICT {thDiff}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Divider + Next trip */}
        {hasNext && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 10,
              borderTop: `1px solid ${divider}`,
              paddingTop: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Flags */}
              <span style={{ fontSize: 16 }}>
                {nextTripData.trip.countries.map((c) => resolveFlag(c)).join("  ")}
              </span>

              {/* Date + duration + countdown */}
              <span style={{ fontSize: 12, color: mutedFg, fontWeight: 500 }}>
                {formatDateRange(nextTripData.trip.startDate, nextTripData.trip.endDate)} · {nextTripData.trip.totalDays} days
              </span>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: getCountryInfo(nextTripData.trip.countries[0]).color,
                }}
              >
                in {nextTripData.daysUntil} day{nextTripData.daysUntil !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "auto",
          }}
        >
          <span style={{ fontSize: 10, color: labelFg }}>
            More info →
          </span>
          <span
            style={{
              fontSize: 10,
              color: mutedFg,
              fontWeight: 600,
              marginLeft: 4,
            }}
          >
            whereisgio.live
          </span>
        </div>
      </div>
    ),
    {
      width: 600,
      height,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}

export const GET = withApiLogging("/api/email-banner", handler);
