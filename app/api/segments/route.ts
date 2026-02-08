import { NextResponse } from "next/server";
import { getCachedSegments } from "@/lib/cache";
import { withApiLogging } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

async function handleGet() {
  const segments = getCachedSegments() ?? [];
  return NextResponse.json({ segments });
}

export const GET = withApiLogging("/api/segments", handleGet);
