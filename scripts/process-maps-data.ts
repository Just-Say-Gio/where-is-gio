#!/usr/bin/env npx tsx
/**
 * CLI script to process Google Maps data exports into aggregated stats.
 *
 * Usage:
 *   npx tsx scripts/process-maps-data.ts
 *   npx tsx scripts/process-maps-data.ts --insights   # also generate AI insights via Groq
 *   npx tsx scripts/process-maps-data.ts --heatmap    # generate heatmap JSON + photo thumbnails
 *
 * Reads local files (gitignored, never committed):
 *   - Timeline (2).json          (233MB phone export)
 *   - takeout/Maps (your places)/Reviews.json
 *   - Takeout/Maps/Photos and videos/*.json
 *
 * Writes:
 *   - data/maps-stats.json       (committed, safe — no GPS coords/placeIds)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { processTimeline, processReviews, processPhotos, extractHeatmapData, MapsStatsOutput } from "../lib/timeline-parser";

const ROOT = join(__dirname, "..");

// Load .env.local for GROQ_API_KEY
config({ path: join(ROOT, ".env.local") });

// ── File paths (local data — gitignored) ──

const TIMELINE_PATH = join(ROOT, "Timeline (2).json");
const REVIEWS_PATHS = [
  join(ROOT, "takeout", "Maps (your places)", "Reviews.json"),
  join(ROOT, "Takeout", "Maps (your places)", "Reviews.json"),
];
const PHOTO_DIRS = [
  join(ROOT, "Takeout", "Maps", "Photos and videos"),
  join(ROOT, "takeout", "Maps", "Photos and videos"),
];
const OUTPUT_PATH = join(ROOT, "data", "maps-stats.json");
const HEATMAP_PATH = join(ROOT, "data", "maps-heatmap.json");
const HEATMAP_IMG_DIR = join(ROOT, "public", "photos", "heatmap");

// ── Helpers ──

function findExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function log(msg: string) {
  console.log(`  ${msg}`);
}

// ── Main ──

async function main() {
  const startTime = Date.now();
  const wantInsights = process.argv.includes("--insights");
  const wantHeatmap = process.argv.includes("--heatmap");

  console.log("\n=== Google Maps Data Processor ===\n");

  // 1. Timeline
  let timelineResult: ReturnType<typeof processTimeline> | null = null;
  let rawSegments: unknown[] = [];

  if (existsSync(TIMELINE_PATH)) {
    log("Reading Timeline (2).json...");
    const raw = readFileSync(TIMELINE_PATH, "utf-8");
    log(`  File size: ${(Buffer.byteLength(raw) / 1024 / 1024).toFixed(1)} MB`);

    const data = JSON.parse(raw);
    const segments = data.semanticSegments ?? data;

    if (!Array.isArray(segments)) {
      console.error("ERROR: Could not find semanticSegments array in timeline data");
      process.exit(1);
    }

    log(`  Found ${segments.length.toLocaleString()} segments`);
    rawSegments = segments;
    log("Processing timeline...");
    timelineResult = processTimeline(segments);
    log(`  Visits: ${timelineResult.counts.totalVisits.toLocaleString()}`);
    log(`  Activities: ${timelineResult.counts.totalActivities.toLocaleString()}`);
    log(`  Unique places: ${timelineResult.counts.uniquePlaces.toLocaleString()}`);
    log(`  Total distance: ${timelineResult.distance.totalKm.toLocaleString()} km`);
    log(`  Days tracked: ${timelineResult.counts.totalDaysTracked.toLocaleString()}`);
    log(`  Trips: ${timelineResult.counts.totalTrips}`);
    log(`  Date range: ${timelineResult.dataRange.start} → ${timelineResult.dataRange.end}`);
  } else {
    console.error(`ERROR: Timeline file not found at ${TIMELINE_PATH}`);
    process.exit(1);
  }

  // 2. Reviews
  let reviewStats: MapsStatsOutput["reviews"] = null;
  const reviewPath = findExisting(REVIEWS_PATHS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawReviewFeatures: any[] = [];

  if (reviewPath) {
    log("\nReading Reviews.json...");
    const raw = readFileSync(reviewPath, "utf-8");
    const data = JSON.parse(raw);
    rawReviewFeatures = data.features ?? [];
    log(`  Found ${rawReviewFeatures.length} reviews`);
    reviewStats = processReviews(rawReviewFeatures);
    log(`  Countries: ${reviewStats.countries}`);
    log(`  Avg rating: ${reviewStats.avgRating}`);
  } else {
    log("\nNo Reviews.json found — skipping");
  }

  // 3. Photos
  let photoStats: MapsStatsOutput["photos"] = null;
  const photoDir = findExisting(PHOTO_DIRS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let photoMetas: any[] = [];

  if (photoDir) {
    log("\nScanning photo metadata...");
    const files = readdirSync(photoDir).filter((f) => f.endsWith(".json"));
    log(`  Found ${files.length} JSON sidecars`);

    for (const f of files) {
      try {
        const meta = JSON.parse(readFileSync(join(photoDir, f), "utf-8"));
        photoMetas.push(meta);
      } catch {
        // skip malformed
      }
    }
    photoStats = processPhotos(photoMetas);
    log(`  Geotagged: ${photoStats.geotagged} / ${photoStats.total}`);
    if (photoStats.dateRange) {
      log(`  Date range: ${photoStats.dateRange.start} → ${photoStats.dateRange.end}`);
    }
  } else {
    log("\nNo photo directory found — skipping");
  }

  // 4. AI insights (optional)
  let insights: string[] | null = null;

  if (wantInsights && timelineResult) {
    log("\nGenerating AI insights via Groq...");
    try {
      insights = await generateInsights(timelineResult, reviewStats, photoStats);
      log(`  Generated ${insights.length} insights`);
    } catch (err) {
      console.error("  Failed to generate insights:", err);
    }
  }

  // 4b. Heatmap (optional)
  if (wantHeatmap && rawSegments.length > 0) {
    log("\nProcessing heatmap data...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatResult = extractHeatmapData(rawSegments as any[], photoMetas, rawReviewFeatures);
    log(`  Heat cells: ${heatResult.heatPoints.length} (from ${heatResult.stats.totalVisits} non-HOME/WORK visits)`);
    log(`  Top photos: ${heatResult.topPhotos.length} (from ${heatResult.stats.totalPhotos} geotagged)`);
    log(`  Total photo views: ${heatResult.stats.totalPhotoViews.toLocaleString()}`);
    log(`  Reviews: ${heatResult.reviews.length} with coordinates`);
    if (heatResult.topPhotos[0]) {
      log(`  Most viewed: ${heatResult.topPhotos[0].title} (${heatResult.topPhotos[0].imageViews.toLocaleString()} views)`);
    }

    // Copy + resize top 100 photo thumbnails
    if (photoDir && heatResult.topPhotos.length > 0) {
      log("\n  Resizing thumbnails...");
      mkdirSync(HEATMAP_IMG_DIR, { recursive: true });
      const { default: sharp } = await import("sharp");
      let copied = 0;
      for (const photo of heatResult.topPhotos) {
        const srcPath = join(photoDir, photo.originalFilename);
        const destPath = join(HEATMAP_IMG_DIR, photo.originalFilename);
        if (existsSync(srcPath)) {
          try {
            await sharp(srcPath)
              .resize(400, 300, { fit: "cover" })
              .jpeg({ quality: 80 })
              .toFile(destPath);
            copied++;
          } catch {
            // skip unreadable images
          }
        }
      }
      log(`  Copied ${copied} thumbnails to public/photos/heatmap/`);
    }

    // Write heatmap JSON
    const heatmapOutput = {
      processedAt: new Date().toISOString(),
      heatPoints: heatResult.heatPoints,
      topPhotos: heatResult.topPhotos.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        imageViews: p.imageViews,
        title: p.title,
        description: p.description,
        date: p.date,
        imagePath: `/photos/heatmap/${p.originalFilename}`,
      })),
      reviews: heatResult.reviews,
      stats: heatResult.stats,
    };

    writeFileSync(HEATMAP_PATH, JSON.stringify(heatmapOutput, null, 2));
    log(`  Wrote data/maps-heatmap.json`);
  }

  // 5. Assemble output
  const output: MapsStatsOutput = {
    ...timelineResult,
    reviews: reviewStats,
    photos: photoStats,
    insights,
  };

  // 6. Write
  log("\nWriting data/maps-stats.json...");
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nDone in ${elapsed}s`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`  Total distance:  ${output.distance.totalKm.toLocaleString()} km`);
  console.log(`  Visits:          ${output.counts.totalVisits.toLocaleString()}`);
  console.log(`  Unique places:   ${output.counts.uniquePlaces.toLocaleString()}`);
  console.log(`  Activities:      ${output.counts.totalActivities.toLocaleString()}`);
  console.log(`  Trips:           ${output.counts.totalTrips}`);
  console.log(`  Days tracked:    ${output.counts.totalDaysTracked.toLocaleString()}`);
  console.log(`  Years:           ${output.yearlyStats.length} (${output.dataRange.start.slice(0, 4)}-${output.dataRange.end.slice(0, 4)})`);
  if (reviewStats) console.log(`  Reviews:         ${reviewStats.total} across ${reviewStats.countries} countries`);
  if (photoStats) console.log(`  Photos:          ${photoStats.geotagged} geotagged / ${photoStats.total} total`);
  if (insights) console.log(`  AI insights:     ${insights.length}`);
  console.log(`\n  Output: ${OUTPUT_PATH}\n`);

  // Distance breakdown
  console.log("=== Distance by Mode ===");
  const modes = Object.entries(output.distance)
    .filter(([k]) => k !== "totalKm")
    .sort(([, a], [, b]) => b - a);
  for (const [mode, km] of modes) {
    if (km > 0) {
      const pct = ((km / output.distance.totalKm) * 100).toFixed(1);
      console.log(`  ${mode.padEnd(14)} ${km.toLocaleString().padStart(10)} km  (${pct}%)`);
    }
  }
  console.log();
}

// ── Groq AI insights ──

function buildYearEvolution(yearlyStats: ReturnType<typeof processTimeline>["yearlyStats"]): string {
  const sorted = [...yearlyStats].sort((a, b) => a.year - b.year);
  return sorted
    .map((y) => {
      const countries = (y.countries ?? []).join(", ") || "unknown";
      const topModes = Object.entries(y.distanceByMode)
        .filter(([, km]) => km > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([m, km]) => `${m}:${km.toLocaleString()}km`)
        .join(", ");
      return `${y.year}: ${y.totalKm.toLocaleString()}km, ${y.uniquePlaces} places, ${y.trips} trips, ${y.daysTracked}d tracked, ${y.timezones}tz, countries=[${countries}], modes=[${topModes}]`;
    })
    .join("\n");
}

async function generateInsights(
  timeline: ReturnType<typeof processTimeline>,
  reviews: MapsStatsOutput["reviews"],
  photos: MapsStatsOutput["photos"]
): Promise<string[]> {
  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq();

  const earthCircumference = 40075;
  const moonDistance = 384400;
  const totalKm = timeline.distance.totalKm;

  const statsContext = {
    totalKm,
    earthMultiple: +(totalKm / earthCircumference).toFixed(1),
    moonFraction: +(totalKm / moonDistance * 100).toFixed(1),
    distanceByMode: timeline.distance,
    visits: timeline.counts.totalVisits,
    uniquePlaces: timeline.counts.uniquePlaces,
    trips: timeline.counts.totalTrips,
    daysTracked: timeline.counts.totalDaysTracked,
    yearlyStats: timeline.yearlyStats.map((y) => ({
      ...y,
      countries: y.countries ?? [],
    })),
    records: timeline.records,
    dateRange: timeline.dataRange,
    reviews: reviews
      ? {
          total: reviews.total,
          countries: reviews.countries,
          avgRating: reviews.avgRating,
          byCountry: reviews.byCountry,
          ratingDistribution: reviews.ratingDistribution,
          byYear: reviews.byYear,
        }
      : null,
    photos: photos
      ? {
          total: photos.total,
          geotagged: photos.geotagged,
          byYear: photos.byYear,
          dateRange: photos.dateRange,
        }
      : null,
  };

  const yearEvolution = buildYearEvolution(timeline.yearlyStats);

  // Pre-compute key facts the AI can quote directly (avoids LLM math errors)
  const precomputed = {
    earthMultiple: statsContext.earthMultiple,
    moonFraction: statsContext.moonFraction,
    avgKmPerYear: Math.round(totalKm / timeline.yearlyStats.length),
    avgKmPerDay: Math.round(totalKm / timeline.counts.totalDaysTracked),
    flyingPct: Math.round((timeline.distance.flying / totalKm) * 100),
    drivingPct: Math.round((timeline.distance.driving / totalKm) * 100),
    motorcyclingPct: +((timeline.distance.motorcycling / totalKm) * 100).toFixed(1),
    peakYear: [...timeline.yearlyStats].sort((a, b) => b.totalKm - a.totalKm)[0],
    quietestYear: [...timeline.yearlyStats].sort((a, b) => a.totalKm - b.totalKm)[0],
  };

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a sharp travel data analyst writing a deep profile of "Gio" based on ${timeline.yearlyStats.length} years of Google Maps movement data.

## Who is Gio
- Dutch guy, born and raised in the Netherlands. Moved to Thailand around 2018-2019 and has been based in Hua Hin/Bangkok since.
- Digital nomad / remote worker — works across timezones, travels frequently for both leisure and work.
- Rides motorcycles around Thailand. Flies constantly for international trips.
- Has visited 50+ countries lifetime. This data is his complete Google Maps tracking history.

## Pre-computed facts (USE THESE — don't recalculate)
- Total: ${totalKm.toLocaleString()}km = ${precomputed.earthMultiple}x around Earth = ${precomputed.moonFraction}% of the way to the Moon
- Average: ${precomputed.avgKmPerYear.toLocaleString()}km/year, ${precomputed.avgKmPerDay}km/day
- Flying: ${timeline.distance.flying.toLocaleString()}km (${precomputed.flyingPct}%), Driving: ${timeline.distance.driving.toLocaleString()}km (${precomputed.drivingPct}%), Motorcycle: ${timeline.distance.motorcycling.toLocaleString()}km (${precomputed.motorcyclingPct}%)
- Peak year: ${precomputed.peakYear.year} with ${precomputed.peakYear.totalKm.toLocaleString()}km
- Quietest year: ${precomputed.quietestYear.year} with ${precomputed.quietestYear.totalKm.toLocaleString()}km

## Generate exactly 10 insights in this order:

1-2. **TRAVEL PERSONALITY**: What archetype is Gio? Hub-and-spoke (Thailand base + raids) or perpetual nomad? Revisiter or explorer? What does the mix of 212 trips across 5,190 places say?

3-4. **EVOLUTION**: How did Gio transform from Netherlands-based European to Thailand-based Asian explorer? Identify the inflection years. Track how country lists shifted from European to Asian.

5-6. **HIDDEN PATTERNS**: Transport mode shifts, review behavior (638 reviews, 4.85 avg across 26 countries), seasonal rhythms, the motorcycle obsession in Thailand, or any clustering.

7-8. **SCALE**: Put the raw numbers into vivid real-world comparisons. Use the pre-computed earth/moon numbers. Compare motorcycle km to a specific real route. Compare walking km to something tangible.

9-10. **QUIRKY DEEP CUTS**: Weirdest outliers. The year with an extreme stat. The absurd ratio between peak vs quietest year. Any unexpected data points.

## Style rules
- MAX 2 sentences per insight. Be PUNCHY. Think data journalist headline + one supporting fact.
- EVERY insight MUST cite specific numbers. No vague claims.
- Always say "Gio" (third person). Never "you/your".
- DON'T repeat numbers across insights — each insight should surface a DIFFERENT data point.
- Be witty and sharp, not sentimental. No exclamation marks. No "incredible"/"amazing".
- Use the pre-computed facts above rather than trying to calculate percentages yourself.

Return JSON: { "insights": ["...", "...", ...] }`,
      },
      {
        role: "user",
        content: `${JSON.stringify(statsContext, null, 0)}\n\nYear-by-year:\n${yearEvolution}`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Groq response");

  const parsed = JSON.parse(content);
  return parsed.insights ?? [];
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
