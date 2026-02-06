// Approximate UTC offsets per country code (for month-grid tz switch counting)
export const TZ_OFFSETS: Record<string, number> = {
  TH: 7, US: -5, SG: 8, IN: 5.5, GB: 0, CZ: 1, NL: 1,
  PE: -5, IT: 1, BR: -3, MX: -6, DE: 1, HK: 8,
};

// Representative IANA timezone per country code (for Intl formatting + DST)
export const IANA_TIMEZONES: Record<string, string> = {
  TH: "Asia/Bangkok",
  US: "America/New_York",
  SG: "Asia/Singapore",
  IN: "Asia/Kolkata",
  GB: "Europe/London",
  CZ: "Europe/Prague",
  NL: "Europe/Amsterdam",
  PE: "America/Lima",
  IT: "Europe/Rome",
  BR: "America/Sao_Paulo",
  MX: "America/Mexico_City",
  DE: "Europe/Berlin",
  HK: "Asia/Hong_Kong",
};

// Short timezone labels for display
export const TZ_LABELS: Record<string, string> = {
  TH: "ICT", US: "EST", SG: "SGT", IN: "IST", GB: "GMT",
  CZ: "CET", NL: "CET", PE: "PET", IT: "CET", BR: "BRT",
  MX: "CST", DE: "CET", HK: "HKT",
};

/** Get visitor's IANA timezone from the browser */
export function getVisitorTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Get the current UTC offset in hours for an IANA timezone (DST-aware) */
export function getUtcOffset(iana: string): number {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "shortOffset",
    }).formatToParts(now);

    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (!tzPart) return 0;

    // Format is like "GMT+7", "GMT-5", "GMT+5:30", "GMT"
    const match = tzPart.value.match(/GMT([+-]?)(\d+)?(?::(\d+))?/);
    if (!match) return 0;

    const sign = match[1] === "-" ? -1 : 1;
    const hours = parseInt(match[2] || "0", 10);
    const minutes = parseInt(match[3] || "0", 10);
    return sign * (hours + minutes / 60);
  } catch {
    return 0;
  }
}

/** Format current time in a timezone as "3:42 PM" */
export function formatTime(iana: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  } catch {
    return "--:--";
  }
}

/** Format current time as "15:42" (24h) */
export function formatTime24(iana: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: iana,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "--:--";
  }
}

/** Get short timezone label for an IANA timezone */
export function getTimezoneLabel(iana: string, countryCode?: string): string {
  if (countryCode && TZ_LABELS[countryCode]) return TZ_LABELS[countryCode];
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/**
 * Compute signed hour difference: Gio's offset minus visitor's offset.
 * Positive = Gio is ahead. e.g. Gio in TH (+7), visitor in US (-5) → +12
 */
export function getTimeDifference(
  gioCountryCode: string,
  visitorIana: string
): number {
  const gioIana = IANA_TIMEZONES[gioCountryCode] ?? "Asia/Bangkok";
  const gioOffset = getUtcOffset(gioIana);
  const visitorOffset = getUtcOffset(visitorIana);
  return gioOffset - visitorOffset;
}

/** Format an offset as "+12h", "-3h", "+5.5h" */
export function formatOffset(hours: number): string {
  const sign = hours >= 0 ? "+" : "";
  const display = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  return `${sign}${display}h`;
}

// --- Meeting planner logic ---

export type HourQuality = "good" | "okay" | "bad";

/** Classify a single hour (0-23) for meeting suitability */
export function classifyHour(hour: number): HourQuality {
  if (hour >= 9 && hour <= 17) return "good"; // 9 AM – 5:59 PM
  if ((hour >= 7 && hour <= 8) || (hour >= 18 && hour <= 20)) return "okay";
  return "bad"; // 9 PM – 6:59 AM
}

/** Combined meeting quality = the worse of the two sides */
export function getMeetingQuality(
  gioHour: number,
  visitorHour: number
): HourQuality {
  const g = classifyHour(gioHour);
  const v = classifyHour(visitorHour);
  if (g === "bad" || v === "bad") return "bad";
  if (g === "okay" || v === "okay") return "okay";
  return "good";
}

export interface MeetingHour {
  gioHour: number;
  visitorHour: number;
  quality: HourQuality;
}

/** Generate 24-hour meeting grid keyed by Gio's hours */
export function generateMeetingGrid(
  gioCountryCode: string,
  visitorIana: string
): MeetingHour[] {
  const diff = getTimeDifference(gioCountryCode, visitorIana);
  const grid: MeetingHour[] = [];

  for (let gioHour = 0; gioHour < 24; gioHour++) {
    let visitorHour = gioHour - diff;
    // Normalize to 0-23
    visitorHour = ((Math.round(visitorHour) % 24) + 24) % 24;
    grid.push({
      gioHour,
      visitorHour,
      quality: getMeetingQuality(gioHour, visitorHour),
    });
  }

  return grid;
}

export interface MeetingWindow {
  startGio: number;
  endGio: number;
  startVisitor: number;
  endVisitor: number;
  quality: HourQuality;
}

/** Find the best contiguous meeting window */
export function findBestWindow(grid: MeetingHour[]): MeetingWindow | null {
  // Try "good" first, then "okay"
  for (const target of ["good", "okay"] as HourQuality[]) {
    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;

    for (let i = 0; i < grid.length; i++) {
      if (grid[i].quality === target || (target === "okay" && grid[i].quality === "good")) {
        if (curStart === -1) curStart = i;
        curLen++;
      } else {
        if (curLen > bestLen) {
          bestStart = curStart;
          bestLen = curLen;
        }
        curStart = -1;
        curLen = 0;
      }
    }
    if (curLen > bestLen) {
      bestStart = curStart;
      bestLen = curLen;
    }

    if (bestStart >= 0 && bestLen > 0) {
      const endIdx = bestStart + bestLen - 1;
      return {
        startGio: grid[bestStart].gioHour,
        endGio: grid[endIdx].gioHour + 1, // end is exclusive
        startVisitor: grid[bestStart].visitorHour,
        endVisitor: (grid[endIdx].visitorHour + 1) % 24,
        quality: target,
      };
    }
  }

  return null;
}

/** Format hour (0-23) as "9 AM", "12 PM", "12 AM" */
export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}
