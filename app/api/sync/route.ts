import { NextResponse } from "next/server";
import { fetchNotionPageContent } from "@/lib/notion";
import { parseTravelData } from "@/lib/ai-parser";
import {
  setCachedSegments,
  getContentHash,
  getCachedHash,
} from "@/lib/cache";

export async function GET() {
  try {
    const content = await fetchNotionPageContent();
    const hash = getContentHash(content);

    // Skip re-parsing if content hasn't changed
    if (getCachedHash() === hash) {
      return NextResponse.json({
        success: true,
        message: "Content unchanged, using cached data",
        cached: true,
      });
    }

    const segments = await parseTravelData(content);
    setCachedSegments(segments, hash);

    return NextResponse.json({
      success: true,
      segmentCount: segments.length,
      cached: false,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
