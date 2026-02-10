import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getCachedSegments } from "@/lib/cache";
import {
  getCurrentSegment,
  getCurrentTrip,
  getNextTrip,
  getMonthShortName,
} from "@/lib/calendar-utils";
import { getCountryInfo, resolveFlag } from "@/lib/countries";
import { withApiLogging } from "@/lib/api-logger";
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

function tripCountryFlags(trip: Trip): string {
  return trip.countries
    .map((code) => resolveFlag(code))
    .join(" ");
}

function tripCountryNames(trip: Trip, max = 3): string {
  const names = trip.countries.map((c) => getCountryInfo(c).name);
  if (names.length <= max) return names.join(" → ");
  return names.slice(0, max).join(" → ") + ` +${names.length - max}`;
}

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme") === "light" ? "light" : "dark";

  const segments = getCachedSegments();
  const currentSeg = segments ? getCurrentSegment(segments) : null;
  const currentTrip = segments ? getCurrentTrip(segments) : null;
  const nextTripData = segments ? getNextTrip(segments) : null;

  const homeInfo = getCountryInfo("TH");

  const isDark = theme === "dark";
  const bg = isDark ? "#18181b" : "#ffffff";
  const fg = isDark ? "#fafafa" : "#18181b";
  const mutedFg = isDark ? "#a1a1aa" : "#71717a";
  const dimFg = isDark ? "#71717a" : "#a1a1aa";

  // Determine current location text
  let nowText: string;
  let nowColor: string;
  if (currentSeg && currentSeg.countryCode !== "TH") {
    const info = getCountryInfo(currentSeg.countryCode);
    const flag = resolveFlag(currentSeg.countryCode, currentSeg.city);
    nowText = `${flag} ${currentSeg.city || info.name}`;
    nowColor = info.color;
  } else {
    nowText = `${homeInfo.flag} Thailand`;
    nowColor = homeInfo.color;
  }

  // Determine next trip text
  let nextText: string | null = null;
  let nextColor: string = "#3B82F6";
  if (currentTrip && currentSeg && currentSeg.countryCode !== "TH") {
    // Currently on a trip — show the full trip info
    nextText = `${tripCountryFlags(currentTrip)} ${tripCountryNames(currentTrip)} · ${formatDateRange(currentTrip.startDate, currentTrip.endDate)} · ${currentTrip.totalDays}d`;
    nextColor = getCountryInfo(currentTrip.countries[0]).color;
  }
  if (nextTripData) {
    const { trip, daysUntil } = nextTripData;
    const firstInfo = getCountryInfo(trip.countries[0]);
    nextText = `Next: ${tripCountryFlags(trip)} ${tripCountryNames(trip)} · ${formatDateRange(trip.startDate, trip.endDate)} · ${trip.totalDays}d · in ${daysUntil}d`;
    nextColor = firstInfo.color;
  }

  // Compact banner: 600 x 60 (one line) or 600 x 90 (two lines)
  const hasNext = !!nextText;
  const height = hasNext ? 90 : 50;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          fontFamily: "system-ui, sans-serif",
          alignItems: "center",
        }}
      >
        {/* Split accent strip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 5,
            height: "100%",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, backgroundColor: nowColor }} />
          {hasNext && (
            <div style={{ flex: 1, backgroundColor: nextColor }} />
          )}
        </div>

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: hasNext ? "10px 20px" : "8px 20px",
            gap: 4,
          }}
        >
          {/* Line 1: current location */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 600, color: fg }}>
              {nowText}
            </span>
            {currentSeg && currentSeg.countryCode !== "TH" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: nowColor,
                  }}
                />
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: nowColor }}
                >
                  now
                </span>
              </div>
            )}
          </div>

          {/* Line 2: next trip */}
          {nextText && (
            <span style={{ fontSize: 14, color: mutedFg, fontWeight: 500 }}>
              {nextText}
            </span>
          )}
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 10, color: dimFg }}>
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
