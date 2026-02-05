import { NextResponse } from "next/server";
import { fetchNotionPageContent } from "@/lib/notion";
import { parseTravelData } from "@/lib/ai-parser";
import {
  setCachedSegments,
  getContentHash,
  getCachedHash,
  getCacheStatus,
} from "@/lib/cache";

export async function GET() {
  const steps: { step: string; status: "ok" | "skipped" | "error"; detail?: string; ms?: number }[] = [];

  try {
    // Step 1: Fetch from Notion
    const notionStart = Date.now();
    const content = await fetchNotionPageContent();
    const notionMs = Date.now() - notionStart;
    steps.push({ step: "Notion fetch", status: "ok", detail: `${content.length} chars`, ms: notionMs });

    // Step 2: Check hash
    const hash = getContentHash(content);
    if (getCachedHash() === hash) {
      steps.push({ step: "Groq AI parse", status: "skipped", detail: "Content unchanged" });
      return NextResponse.json({
        success: true,
        cached: true,
        steps,
        ...getCacheStatus(),
      });
    }

    // Step 3: Parse with Groq
    const groqStart = Date.now();
    const segments = await parseTravelData(content);
    const groqMs = Date.now() - groqStart;
    steps.push({ step: "Groq AI parse", status: "ok", detail: `${segments.length} segments`, ms: groqMs });

    // Step 4: Update cache
    setCachedSegments(segments, hash);
    steps.push({ step: "Cache update", status: "ok" });

    return NextResponse.json({
      success: true,
      cached: false,
      steps,
      ...getCacheStatus(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Figure out which step failed
    if (steps.length === 0) {
      steps.push({ step: "Notion fetch", status: "error", detail: msg });
    } else if (steps.length === 1) {
      steps.push({ step: "Groq AI parse", status: "error", detail: msg });
    } else {
      steps.push({ step: "Cache update", status: "error", detail: msg });
    }

    return NextResponse.json(
      { success: false, steps, ...getCacheStatus() },
      { status: 500 }
    );
  }
}
