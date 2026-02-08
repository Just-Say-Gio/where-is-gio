import { getCachedSegments } from "@/lib/cache";
import { getOverridesMap } from "@/lib/hosting";
import { getRiceRunsMap } from "@/lib/rice-runs";
import { WhenCalendarWrapper } from "@/components/when-calendar-wrapper";

export const dynamic = "force-dynamic";

const YEAR = 2026;

export default function WhenPage() {
  const segments = getCachedSegments() ?? [];
  const overrides = getOverridesMap();
  const riceRunsMap = getRiceRunsMap();
  const riceRunDates = Object.keys(riceRunsMap);

  // Find all Thailand date ranges from segments
  const thailandDates = new Set<string>();
  for (const seg of segments) {
    if (seg.countryCode !== "TH") continue;
    const start = new Date(seg.startDate + "T00:00:00");
    const end = new Date(seg.endDate + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      thailandDates.add(ds);
    }
  }

  return (
    <WhenCalendarWrapper
      year={YEAR}
      thailandDates={Array.from(thailandDates)}
      overrides={Object.keys(overrides)}
      riceRunDates={riceRunDates}
    />
  );
}
