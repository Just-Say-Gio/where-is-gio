import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { CacheEntry, TravelSegment, YearSummary } from "./types";

const CACHE_FILE = join(process.cwd(), ".cache", "segments.json");
const CACHE_TTL_MS =
  (parseInt(process.env.SYNC_INTERVAL_HOURS || "6", 10)) * 60 * 60 * 1000;

function readCache(): CacheEntry | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry): void {
  try {
    const dir = join(process.cwd(), ".cache");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify(entry), "utf-8");
  } catch (err) {
    console.error("Failed to write cache file:", err);
  }
}

export function getCachedSegments(): TravelSegment[] | null {
  const cache = readCache();
  if (!cache) return null;
  return cache.segments;
}

export function setCachedSegments(
  segments: TravelSegment[],
  contentHash: string,
  monthInsights?: string[],
  yearSummary?: YearSummary
): void {
  writeCache({
    segments,
    lastFetched: Date.now(),
    contentHash,
    monthInsights,
    yearSummary,
  });
}

export function getCachedMonthInsights(): string[] | null {
  const cache = readCache();
  return cache?.monthInsights ?? null;
}

export function getCachedYearSummary(): YearSummary | null {
  const cache = readCache();
  return cache?.yearSummary ?? null;
}

export function isCacheStale(): boolean {
  const cache = readCache();
  if (!cache) return true;
  return Date.now() - cache.lastFetched > CACHE_TTL_MS;
}

export function getCachedHash(): string | null {
  const cache = readCache();
  return cache?.contentHash ?? null;
}

export function getContentHash(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

export function getCacheStatus() {
  const cache = readCache();
  if (!cache) return { hasData: false, lastSynced: null, segmentCount: 0 };
  return {
    hasData: true,
    lastSynced: cache.lastFetched,
    segmentCount: cache.segments.length,
  };
}
