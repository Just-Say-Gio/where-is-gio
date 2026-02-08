import { NextResponse } from "next/server";
import { getCacheStatus } from "@/lib/cache";
import { withApiLogging } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

async function handleGet() {
  return NextResponse.json(getCacheStatus());
}

export const GET = withApiLogging("/api/sync/status", handleGet);
