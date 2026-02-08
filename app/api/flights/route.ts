import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { parseFlightsCSV } from "@/lib/flights-parser";
import {
  setCachedFlightAnalytics,
  getCachedFlightAnalytics,
  getFlightsCacheStatus,
  getFlightsCsvHash,
} from "@/lib/flights-cache";
import { withApiLogging } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

async function handlePost() {
  const steps: { step: string; status: "ok" | "skipped" | "error"; detail?: string; ms?: number }[] = [];

  try {
    const csvStart = Date.now();
    const csvPath = join(process.cwd(), "flights_export.csv");
    const csvRaw = readFileSync(csvPath, "utf-8");
    const csvHash = createHash("md5").update(csvRaw).digest("hex");
    steps.push({ step: "Read CSV", status: "ok", detail: `${csvRaw.length} chars`, ms: Date.now() - csvStart });

    if (getFlightsCsvHash() === csvHash) {
      steps.push({ step: "Parse flights", status: "skipped", detail: "CSV unchanged" });
      const status = getFlightsCacheStatus();
      return NextResponse.json({ success: true, cached: true, steps, ...status });
    }

    const parseStart = Date.now();
    const { analytics } = parseFlightsCSV();
    steps.push({
      step: "Parse flights",
      status: "ok",
      detail: `${analytics.totalFlights} flights, ${analytics.totalCountries} countries, ${analytics.totalCities} cities`,
      ms: Date.now() - parseStart,
    });

    setCachedFlightAnalytics(analytics, csvHash);
    steps.push({ step: "Cache update", status: "ok" });

    const status = getFlightsCacheStatus();
    return NextResponse.json({ success: true, cached: false, steps, ...status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    steps.push({ step: "Parse flights", status: "error", detail: msg });
    return NextResponse.json({ success: false, steps }, { status: 500 });
  }
}

async function handleGet() {
  const analytics = getCachedFlightAnalytics();
  const status = getFlightsCacheStatus();
  return NextResponse.json({ ...status, analytics });
}

export const POST = withApiLogging("/api/flights", handlePost);
export const GET = withApiLogging("/api/flights", handleGet);
