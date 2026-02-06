import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { FlightAnalytics, FlightsCacheEntry } from "./types";

const FLIGHTS_CACHE_FILE = join(process.cwd(), ".cache", "flights.json");

function readFlightsCache(): FlightsCacheEntry | null {
  try {
    if (!existsSync(FLIGHTS_CACHE_FILE)) return null;
    const raw = readFileSync(FLIGHTS_CACHE_FILE, "utf-8");
    return JSON.parse(raw) as FlightsCacheEntry;
  } catch {
    return null;
  }
}

function writeFlightsCache(entry: FlightsCacheEntry): void {
  try {
    const dir = join(process.cwd(), ".cache");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(FLIGHTS_CACHE_FILE, JSON.stringify(entry), "utf-8");
  } catch (err) {
    console.error("Failed to write flights cache:", err);
  }
}

export function getCachedFlightAnalytics(): FlightAnalytics | null {
  const cache = readFlightsCache();
  return cache?.analytics ?? null;
}

export function setCachedFlightAnalytics(
  analytics: FlightAnalytics,
  csvHash: string
): void {
  writeFlightsCache({
    analytics,
    lastParsed: Date.now(),
    csvHash,
    recordCount: analytics.totalFlights,
  });
}

export function getFlightsCacheStatus() {
  const cache = readFlightsCache();
  if (!cache) return { hasData: false, lastParsed: null, recordCount: 0 };
  return {
    hasData: true,
    lastParsed: cache.lastParsed,
    recordCount: cache.recordCount,
  };
}

export function getFlightsCsvHash(): string | null {
  return readFlightsCache()?.csvHash ?? null;
}
