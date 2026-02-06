import { CalendarDay, TravelSegment } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month];
}

export function getMonthShortName(month: number): string {
  return MONTH_SHORT[month];
}

export function generateYearDays(year: number): CalendarDay[][] {
  const months: CalendarDay[][] = [];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        date,
        dayOfMonth: day,
      });
    }

    months.push(days);
  }

  return months;
}

export function assignSegmentsToDays(
  months: CalendarDay[][],
  segments: TravelSegment[]
): CalendarDay[][] {
  return months.map((monthDays) =>
    monthDays.map((day) => {
      const dayTime = new Date(day.date + "T00:00:00").getTime();

      // Find the segment that covers this day
      // Prefer confirmed/placeholder over option/transit
      let bestSegment: TravelSegment | undefined;

      for (const segment of segments) {
        const start = new Date(segment.startDate + "T00:00:00").getTime();
        const end = new Date(segment.endDate + "T00:00:00").getTime();

        if (dayTime >= start && dayTime <= end) {
          if (
            !bestSegment ||
            segmentPriority(segment) > segmentPriority(bestSegment)
          ) {
            bestSegment = segment;
          }
        }
      }

      return {
        ...day,
        segment: bestSegment,
      };
    })
  );
}

function segmentPriority(segment: TravelSegment): number {
  switch (segment.status) {
    case "confirmed":
      return 3;
    case "placeholder":
      return 2;
    case "transit":
      return 1;
    case "option":
      return 0;
    default:
      return 2;
  }
}

export function getCurrentSegment(
  segments: TravelSegment[]
): TravelSegment | null {
  const today = new Date();
  const todayStr =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  const todayTime = new Date(todayStr + "T00:00:00").getTime();

  for (const segment of segments) {
    const start = new Date(segment.startDate + "T00:00:00").getTime();
    const end = new Date(segment.endDate + "T00:00:00").getTime();
    if (todayTime >= start && todayTime <= end) {
      return segment;
    }
  }
  return null;
}

export function getNextSegment(
  segments: TravelSegment[]
): { segment: TravelSegment; daysUntil: number } | null {
  const today = new Date();
  const todayStr =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  const todayTime = new Date(todayStr + "T00:00:00").getTime();

  let best: { segment: TravelSegment; daysUntil: number } | null = null;

  for (const segment of segments) {
    const start = new Date(segment.startDate + "T00:00:00").getTime();
    if (start > todayTime) {
      const daysUntil = Math.round((start - todayTime) / (1000 * 60 * 60 * 24));
      if (!best || daysUntil < best.daysUntil) {
        best = { segment, daysUntil };
      }
    }
  }

  return best;
}

export function getStartDayOfWeek(year: number, month: number): number {
  // Returns 0=Monday, 1=Tuesday, ... 6=Sunday (Monday-start week)
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function getISOWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getTodayString(): string {
  const today = new Date();
  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}
