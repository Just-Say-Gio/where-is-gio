import { createHash } from "crypto";
import { CacheEntry, TravelSegment } from "./types";

const CACHE_TTL_MS =
  (parseInt(process.env.SYNC_INTERVAL_HOURS || "6", 10)) * 60 * 60 * 1000;

let cache: CacheEntry | null = null;

export function getCachedSegments(): TravelSegment[] | null {
  if (!cache) return null;
  return cache.segments;
}

export function setCachedSegments(
  segments: TravelSegment[],
  contentHash: string
): void {
  cache = {
    segments,
    lastFetched: Date.now(),
    contentHash,
  };
}

export function isCacheStale(): boolean {
  if (!cache) return true;
  return Date.now() - cache.lastFetched > CACHE_TTL_MS;
}

export function getCachedHash(): string | null {
  return cache?.contentHash ?? null;
}

export function getContentHash(content: string): string {
  return createHash("md5").update(content).digest("hex");
}
