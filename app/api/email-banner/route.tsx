import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getCachedSegments } from "@/lib/cache";
import {
  getCurrentSegment,
  getNextSegment,
  getMonthShortName,
} from "@/lib/calendar-utils";
import { getCountryInfo, resolveFlag } from "@/lib/countries";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const startMonth = getMonthShortName(start.getMonth());
  const endMonth = getMonthShortName(end.getMonth());
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

function getDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00").getTime();
  const end = new Date(endDate + "T00:00:00").getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme") === "light" ? "light" : "dark";
  const style = searchParams.get("style") === "minimal" ? "minimal" : "full";

  const segments = getCachedSegments();
  const current = segments ? getCurrentSegment(segments) : null;
  const next = segments ? getNextSegment(segments) : null;

  // Determine what to show
  const showCurrent = !!current;
  const showNext = !!next;
  const segment = showCurrent ? current! : showNext ? next!.segment : null;
  const countryInfo = segment ? getCountryInfo(segment.countryCode) : null;
  const flag = segment
    ? resolveFlag(segment.countryCode, segment.city)
    : "\u{1F1F9}\u{1F1ED}"; // 🇹🇭
  const accentColor = countryInfo?.color ?? "#F97316";

  const isDark = theme === "dark";
  const bg = isDark ? "#18181b" : "#ffffff";
  const fg = isDark ? "#fafafa" : "#18181b";
  const mutedFg = isDark ? "#a1a1aa" : "#71717a";
  const cardBg = isDark ? "#27272a" : "#f4f4f5";

  // --- Minimal style (600x80) ---
  if (style === "minimal") {
    let line: string;
    if (showCurrent) {
      const city = current!.city || current!.country;
      const dates = formatDateRange(current!.startDate, current!.endDate);
      line = `${flag}  ${city} · ${dates} · right now`;
    } else if (showNext) {
      const city = next!.segment.city || next!.segment.country;
      const dates = formatDateRange(
        next!.segment.startDate,
        next!.segment.endDate
      );
      const days = next!.daysUntil;
      line = `${flag}  ${city} · ${dates} · in ${days} day${days !== 1 ? "s" : ""}`;
    } else {
      line = "\u{1F1F9}\u{1F1ED}  Home in Thailand · whereisgio.live";
    }

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: "100%",
            backgroundColor: bg,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Accent strip */}
          <div
            style={{
              width: 6,
              height: "100%",
              backgroundColor: accentColor,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
              padding: "0 24px",
            }}
          >
            <span style={{ fontSize: 22, color: fg, fontWeight: 600 }}>
              {showCurrent ? "Now:" : "Next:"} {line}
            </span>
            <span style={{ fontSize: 14, color: mutedFg }}>
              whereisgio.live
            </span>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 80,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  }

  // --- Full style (600x200) ---
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
        {/* Left accent strip */}
        <div
          style={{
            width: 8,
            height: "100%",
            backgroundColor: accentColor,
            flexShrink: 0,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "24px 32px",
            gap: 8,
          }}
        >
          {/* Title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: mutedFg,
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
            }}
          >
            {showCurrent ? "Currently in" : showNext ? "Next trip" : "Home base"}
          </div>

          {/* Destination */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 40 }}>{flag}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: fg }}>
                {segment
                  ? segment.city || segment.country
                  : "Thailand"}
              </span>
              <span style={{ fontSize: 16, color: mutedFg }}>
                {segment
                  ? countryInfo?.name ?? segment.country
                  : "Hua Hin"}
              </span>
            </div>
          </div>

          {/* Date range + countdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 4,
            }}
          >
            {segment && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: cardBg,
                  borderRadius: 8,
                  padding: "6px 12px",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14, color: fg, fontWeight: 500 }}>
                  {formatDateRange(segment.startDate, segment.endDate)}
                </span>
                <span style={{ fontSize: 12, color: mutedFg }}>
                  · {getDuration(segment.startDate, segment.endDate)} days
                </span>
              </div>
            )}
            {showCurrent && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: accentColor,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: accentColor,
                  }}
                >
                  right now
                </span>
              </div>
            )}
            {!showCurrent && showNext && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: accentColor,
                }}
              >
                in {next!.daysUntil} day{next!.daysUntil !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: "0 16px 12px 0",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: mutedFg,
              opacity: 0.7,
            }}
          >
            whereisgio.live
          </span>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}

export const GET = withApiLogging("/api/email-banner", handler);
