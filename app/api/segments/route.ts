import { NextResponse } from "next/server";
import { getCachedSegments } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const segments = getCachedSegments() ?? [];
  return NextResponse.json({ segments });
}
