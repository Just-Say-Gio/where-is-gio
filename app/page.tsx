import { getCachedSegments, isCacheStale, setCachedSegments, getContentHash } from "@/lib/cache";
import { fetchNotionPageContent } from "@/lib/notion";
import { parseTravelData } from "@/lib/ai-parser";
import { generateYearDays, assignSegmentsToDays } from "@/lib/calendar-utils";
import { CalendarWrapper } from "@/components/calendar-wrapper";

export const revalidate = 21600; // 6 hours
export const dynamic = "force-dynamic"; // skip prerender — data fetched at runtime via ISR

const YEAR = 2026;

async function getSegments() {
  let segments = getCachedSegments();

  if (!segments || isCacheStale()) {
    const content = await fetchNotionPageContent();
    segments = await parseTravelData(content);
    setCachedSegments(segments, getContentHash(content));
  }

  return segments;
}

export default async function Home() {
  const segments = await getSegments();
  const months = assignSegmentsToDays(generateYearDays(YEAR), segments);

  return (
    <main className="min-h-screen bg-background">
      <CalendarWrapper segments={segments} months={months} year={YEAR} />
    </main>
  );
}
