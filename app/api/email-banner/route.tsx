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

  const currentInfo = current ? getCountryInfo(current.countryCode) : null;
  const currentFlag = current
    ? resolveFlag(current.countryCode, current.city)
    : null;
  const nextInfo = next ? getCountryInfo(next.segment.countryCode) : null;
  const nextFlag = next
    ? resolveFlag(next.segment.countryCode, next.segment.city)
    : null;

  const homeInfo = getCountryInfo("TH");
  const accentColor = currentInfo?.color ?? nextInfo?.color ?? homeInfo.color;

  const isDark = theme === "dark";
  const bg = isDark ? "#18181b" : "#ffffff";
  const fg = isDark ? "#fafafa" : "#18181b";
  const mutedFg = isDark ? "#a1a1aa" : "#71717a";
  const cardBg = isDark ? "#27272a" : "#f4f4f5";
  const dividerColor = isDark ? "#3f3f46" : "#e4e4e7";

  // --- Minimal style (600x100) — two lines ---
  if (style === "minimal") {
    const currentLine = current
      ? `Now: ${currentFlag}  ${current.city || current.country} · ${formatDateRange(current.startDate, current.endDate)}`
      : `${homeInfo.flag}  Home in Thailand`;

    const nextLine = next
      ? `Next: ${nextFlag}  ${next.segment.city || next.segment.country} · ${formatDateRange(next.segment.startDate, next.segment.endDate)} · ${getDuration(next.segment.startDate, next.segment.endDate)}d · in ${next.daysUntil} day${next.daysUntil !== 1 ? "s" : ""}`
      : null;

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
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              padding: "0 24px",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 20, color: fg, fontWeight: 600 }}>
              {currentLine}
            </span>
            {nextLine && (
              <span style={{ fontSize: 16, color: mutedFg, fontWeight: 500 }}>
                {nextLine}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              padding: "0 16px 8px 0",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, color: mutedFg, opacity: 0.7 }}>
              whereisgio.live
            </span>
          </div>
        </div>
      ),
      {
        width: 600,
        height: nextLine ? 100 : 70,
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  }

  // --- Full style (600x250) — both current + next ---
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
        {/* Left accent — gradient from current to next color */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 8,
            height: "100%",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: currentInfo?.color ?? homeInfo.color,
            }}
          />
          {next && (
            <div
              style={{
                flex: 1,
                backgroundColor: nextInfo?.color ?? "#3B82F6",
              }}
            />
          )}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "20px 28px",
            gap: 12,
          }}
        >
          {/* Current location row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: mutedFg,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
              }}
            >
              {current ? "Currently in" : "Home base"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 32 }}>
                {currentFlag ?? homeInfo.flag}
              </span>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <span style={{ fontSize: 24, fontWeight: 700, color: fg }}>
                  {current ? current.city || current.country : "Thailand"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {current && (
                    <span style={{ fontSize: 13, color: mutedFg }}>
                      {formatDateRange(current.startDate, current.endDate)} ·{" "}
                      {getDuration(current.startDate, current.endDate)}d
                    </span>
                  )}
                  {current && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          backgroundColor: currentInfo?.color,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: currentInfo?.color,
                        }}
                      >
                        right now
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider + next trip */}
          {next && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  width: "100%",
                }}
              />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: mutedFg,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  Next trip
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 28 }}>{nextFlag}</span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <span
                      style={{ fontSize: 20, fontWeight: 700, color: fg }}
                    >
                      {next.segment.city || next.segment.country}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          backgroundColor: cardBg,
                          borderRadius: 6,
                          padding: "3px 8px",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{ fontSize: 13, color: fg, fontWeight: 500 }}
                        >
                          {formatDateRange(
                            next.segment.startDate,
                            next.segment.endDate
                          )}
                        </span>
                        <span style={{ fontSize: 11, color: mutedFg }}>
                          ·{" "}
                          {getDuration(
                            next.segment.startDate,
                            next.segment.endDate
                          )}
                          d
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: nextInfo?.color,
                        }}
                      >
                        in {next.daysUntil} day
                        {next.daysUntil !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: "0 14px 10px 0",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: mutedFg, opacity: 0.6 }}>
            whereisgio.live
          </span>
        </div>
      </div>
    ),
    {
      width: 600,
      height: next ? 250 : 160,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}

export const GET = withApiLogging("/api/email-banner", handler);
