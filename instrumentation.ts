export async function register() {
  // Only run on the server (not edge runtime)
  if (typeof window !== "undefined") return;

  console.log("[warm-cache] Starting cache warm-up...");

  // 1. Flights (instant — reads CSV from disk, no network)
  try {
    const { getCachedFlightAnalytics, setCachedFlightAnalytics } = await import(
      "@/lib/flights-cache"
    );

    if (!getCachedFlightAnalytics()) {
      const { parseFlightsCSV } = await import("@/lib/flights-parser");
      const { analytics, csvHash } = parseFlightsCSV();
      setCachedFlightAnalytics(analytics, csvHash);
      console.log(
        `[warm-cache] Flights: parsed ${analytics.totalFlights} flights`
      );
    } else {
      console.log("[warm-cache] Flights: cache already warm");
    }
  } catch (err) {
    console.error("[warm-cache] Flights failed:", err);
  }

  // 2. Notion segments (needs network — Notion API + Groq)
  try {
    const { getCachedSegments, setCachedSegments, getContentHash } =
      await import("@/lib/cache");

    if (!getCachedSegments()) {
      const { fetchNotionPageContent } = await import("@/lib/notion");
      const { parseTravelData } = await import("@/lib/ai-parser");

      const content = await fetchNotionPageContent();
      console.log(`[warm-cache] Notion: fetched ${content.length} chars`);

      const hash = getContentHash(content);
      const segments = await parseTravelData(content);
      setCachedSegments(segments, hash);
      console.log(
        `[warm-cache] Notion: parsed ${segments.length} segments`
      );
    } else {
      console.log("[warm-cache] Notion: cache already warm");
    }
  } catch (err) {
    console.error("[warm-cache] Notion sync failed:", err);
  }

  console.log("[warm-cache] Done.");
}
