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
import { formatTime, getTimezoneLabel, IANA_TIMEZONES } from "@/lib/timezone";
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
  return trip.countries.map((code) => resolveFlag(code)).join(" ");
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
  const nextTripData = segments ? getNextTrip(segments) : null;

  const homeInfo = getCountryInfo("TH");

  const isDark = theme === "dark";
  const bg = isDark ? "#18181b" : "#ffffff";
  const fg = isDark ? "#fafafa" : "#18181b";
  const mutedFg = isDark ? "#a1a1aa" : "#71717a";
  const dimFg = isDark ? "#71717a" : "#a1a1aa";
  const subtleBorder = isDark ? "#27272a" : "#e4e4e7";

  // Current location
  const gioCC = currentSeg?.countryCode ?? "TH";
  const isAbroad = currentSeg && gioCC !== "TH";
  let nowText: string;
  let nowColor: string;
  if (isAbroad) {
    const info = getCountryInfo(gioCC);
    const flag = resolveFlag(gioCC, currentSeg.city);
    nowText = `${flag} ${currentSeg.city || info.name}`;
    nowColor = info.color;
  } else {
    nowText = `${homeInfo.flag} Hua Hin, Thailand`;
    nowColor = homeInfo.color;
  }

  // Timezone info
  const gioIana = IANA_TIMEZONES[gioCC] ?? "Asia/Bangkok";
  const gioTime = formatTime(gioIana);
  const gioLabel = getTimezoneLabel(gioIana, gioCC);
  const mtTime = formatTime("America/Denver");
  const mtLabel = getTimezoneLabel("America/Denver");
  const amsTime = formatTime("Europe/Amsterdam");
  const amsLabel = getTimezoneLabel("Europe/Amsterdam");

  // Next trip
  let nextText: string | null = null;
  let nextColor: string = "#3B82F6";
  if (nextTripData) {
    const { trip, daysUntil } = nextTripData;
    const firstInfo = getCountryInfo(trip.countries[0]);
    nextText = `Next: ${tripCountryFlags(trip)} ${tripCountryNames(trip)} · ${formatDateRange(trip.startDate, trip.endDate)} · ${trip.totalDays}d · in ${daysUntil}d`;
    nextColor = firstInfo.color;
  }

  const hasNext = !!nextText;
  const height = hasNext ? 110 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Accent strip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 4,
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
            padding: "8px 16px",
            gap: 3,
          }}
        >
          {/* Line 1: Location + Gio's time */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: fg }}>
              {nowText}
            </span>
            {isAbroad && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: nowColor,
                  }}
                />
                <span
                  style={{ fontSize: 11, fontWeight: 600, color: nowColor }}
                >
                  now
                </span>
              </div>
            )}
            <span style={{ fontSize: 11, color: dimFg, marginLeft: "auto" }}>
              {gioTime} {gioLabel}
            </span>
          </div>

          {/* Line 2: Timezone references */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 11,
              color: dimFg,
            }}
          >
            <span>
              🏔️ {mtTime} {mtLabel}
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              🇳🇱 {amsTime} {amsLabel}
            </span>
            {gioCC !== "TH" && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>
                  🇹🇭 {formatTime("Asia/Bangkok")} ICT
                </span>
              </>
            )}
          </div>

          {/* Line 3: Next trip */}
          {nextText && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderTop: `1px solid ${subtleBorder}`,
                paddingTop: 4,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: mutedFg, fontWeight: 500 }}>
                {nextText}
              </span>
            </div>
          )}
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            padding: "0 10px 6px 0",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 9, color: dimFg }}>
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
