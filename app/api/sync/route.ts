import { NextResponse } from "next/server";
import { fetchNotionPageContent } from "@/lib/notion";
import { parseTravelData, generateMonthlyInsights, generateYearSummary } from "@/lib/ai-parser";
import {
  setCachedSegments,
  getCachedSegments,
  getCachedMonthInsights,
  getCachedYearSummary,
  getContentHash,
  getCachedHash,
  getCacheStatus,
} from "@/lib/cache";
import { YearSummary } from "@/lib/types";

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

      // Generate insights if missing from cache
      const segments = getCachedSegments();
      let backfillInsights = getCachedMonthInsights() ?? undefined;
      let backfillSummary = getCachedYearSummary() ?? undefined;

      if (!backfillInsights && segments) {
        try {
          const insightsStart = Date.now();
          backfillInsights = await generateMonthlyInsights(segments);
          const insightsMs = Date.now() - insightsStart;
          steps.push({ step: "AI monthly insights", status: "ok", detail: "12 taglines (backfill)", ms: insightsMs });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          steps.push({ step: "AI monthly insights", status: "error", detail: msg });
        }
      } else {
        steps.push({ step: "AI monthly insights", status: "skipped", detail: "Already cached" });
      }

      if (!backfillSummary && segments) {
        try {
          const summaryStart = Date.now();
          backfillSummary = await generateYearSummary(segments);
          const summaryMs = Date.now() - summaryStart;
          steps.push({ step: "AI year summary", status: "ok", detail: `"${backfillSummary.personality}" (backfill)`, ms: summaryMs });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          steps.push({ step: "AI year summary", status: "error", detail: msg });
        }
      } else {
        steps.push({ step: "AI year summary", status: "skipped", detail: "Already cached" });
      }

      // Re-save if we backfilled anything
      if (segments && (backfillInsights || backfillSummary)) {
        setCachedSegments(segments, hash, backfillInsights, backfillSummary);
      }

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

    // Step 4: Generate monthly insights
    let monthInsights: string[] | undefined;
    try {
      const insightsStart = Date.now();
      monthInsights = await generateMonthlyInsights(segments);
      const insightsMs = Date.now() - insightsStart;
      steps.push({ step: "AI monthly insights", status: "ok", detail: "12 taglines", ms: insightsMs });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      steps.push({ step: "AI monthly insights", status: "error", detail: msg });
    }

    // Step 5: Generate year summary
    let yearSummary: YearSummary | undefined;
    try {
      const summaryStart = Date.now();
      yearSummary = await generateYearSummary(segments);
      const summaryMs = Date.now() - summaryStart;
      steps.push({ step: "AI year summary", status: "ok", detail: `"${yearSummary.personality}"`, ms: summaryMs });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      steps.push({ step: "AI year summary", status: "error", detail: msg });
    }

    // Step 6: Update cache
    setCachedSegments(segments, hash, monthInsights, yearSummary);
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
