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

function fmtUtc(h: number): string {
  const s = h >= 0 ? "+" : "";
  return Number.isInteger(h) ? `${s}${h}` : `${s}${h.toFixed(1)}`;
}

function fmtDiff(gioOff: number, refOff: number): string {
  const d = Math.abs(gioOff - refOff);
  if (d < 0.5) return "same";
  const h = Number.isInteger(d) ? `${d}` : d.toFixed(1);
  return gioOff > refOff ? `${h}h behind` : `${h}h ahead`;
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

  // Timezone offsets (static — no live times)
  const gioIana = IANA_TIMEZONES[gioCC] ?? "Asia/Bangkok";
  const gioOff = getUtcOffset(gioIana);
  const gioLabel = getTimezoneLabel(gioIana, gioCC);

  const mtOff = getUtcOffset("America/Denver");
  const mtLabel = getTimezoneLabel("America/Denver");

  const amsOff = getUtcOffset("Europe/Amsterdam");
  const amsLabel = getTimezoneLabel("Europe/Amsterdam");

  // Build timezone string for same line as location
  let tzParts = `${gioLabel} (UTC${fmtUtc(gioOff)}) · ${mtLabel} ${fmtDiff(gioOff, mtOff)} · ${amsLabel} ${fmtDiff(gioOff, amsOff)}`;
  if (gioCC !== "TH") {
    const thOff = getUtcOffset("Asia/Bangkok");
    tzParts += ` · ICT ${fmtDiff(gioOff, thOff)}`;
  }

  // Next trip
  const hasNext = !!nextTripData;
  const height = hasNext ? 120 : 76;

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
          padding: "12px 20px",
        }}
      >
        {/* "Currently in" label */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: labelFg,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Currently in
        </span>

        {/* Location + timezone on one line */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginTop: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: accentColor,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: fg }}>
              {locationFlag} {locationName}
            </span>
          </div>
          <span style={{ fontSize: 11, color: dimFg }}>
            {tzParts}
          </span>
        </div>

        {/* Next trip row */}
        {hasNext && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 10,
              borderTop: `1px solid ${divider}`,
              paddingTop: 10,
              gap: 10,
            }}
          >
            {/* Flags */}
            <span style={{ fontSize: 15, letterSpacing: "0.1em" }}>
              {nextTripData.trip.countries.map((c) => resolveFlag(c)).join(" ")}
            </span>

            {/* Dates + duration */}
            <span style={{ fontSize: 12, color: mutedFg, fontWeight: 500 }}>
              {formatDateRange(nextTripData.trip.startDate, nextTripData.trip.endDate)} · {nextTripData.trip.totalDays} days
            </span>

            {/* Push link to right */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: "auto",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 10, color: labelFg }}>More info</span>
              <span style={{ fontSize: 10, color: mutedFg, fontWeight: 600 }}>
                whereisgio.live
              </span>
            </div>
          </div>
        )}

        {/* Footer only if no next trip */}
        {!hasNext && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "auto",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 10, color: labelFg }}>More info</span>
            <span style={{ fontSize: 10, color: mutedFg, fontWeight: 600 }}>
              whereisgio.live
            </span>
          </div>
        )}
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
