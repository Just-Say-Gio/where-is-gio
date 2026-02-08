import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { withApiLogging } from "@/lib/api-logger";

const STATS_PATH = join(process.cwd(), "data", "maps-stats.json");

async function handlePost() {
  if (!existsSync(STATS_PATH)) {
    return NextResponse.json({ error: "No maps stats found" }, { status: 404 });
  }

  const stats = JSON.parse(readFileSync(STATS_PATH, "utf-8"));

  const groq = new Groq();
  const yearsCount = stats.yearlyStats?.length ?? 0;

  const statsContext = {
    totalKm: stats.distance.totalKm,
    distanceByMode: stats.distance,
    visits: stats.counts.totalVisits,
    uniquePlaces: stats.counts.uniquePlaces,
    trips: stats.counts.totalTrips,
    daysTracked: stats.counts.totalDaysTracked,
    yearlyStats: stats.yearlyStats,
    records: stats.records,
    dataRange: stats.dataRange,
    reviews: stats.reviews ? { total: stats.reviews.total, countries: stats.reviews.countries, avgRating: stats.reviews.avgRating } : null,
    photos: stats.photos ? { total: stats.photos.total, geotagged: stats.photos.geotagged } : null,
  };

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a travel data analyst examining Gio's complete Google Maps movement history spanning ${yearsCount} years. Generate exactly 6 specific, surprising, data-driven observations. Each MUST reference exact numbers from the data. Be analytical, concrete, and creative with comparisons (e.g., "that's X times around the Earth"). Always refer to the person as "Gio" (third person), never "you/your".

Return JSON: { "insights": ["...", "...", ...] }

Good examples:
- "Gio has flown 414,289km — that's 10.3x around the Earth, or about 1 trip to the Moon"
- "22,447km on a motorcycle, almost entirely in Thailand — that's the entire Thai coastline 4 times over"
- "2025 was Gio's most mobile year by far: 175,462km, 2.5x the 10-year average"

Bad examples:
- "You sure love to travel!" (second person, no numbers)
- "What an adventurous soul!" (fluff)`,
      },
      { role: "user", content: JSON.stringify(statsContext) },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "Empty Groq response" }, { status: 500 });
  }

  const parsed = JSON.parse(content);
  const insights = parsed.insights ?? [];

  // Write back to the JSON file
  stats.insights = insights;
  writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));

  return NextResponse.json({ insights, count: insights.length });
}

export const POST = withApiLogging("/api/maps-stats/insights", handlePost);
