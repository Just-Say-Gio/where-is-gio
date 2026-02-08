import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";

const STATS_PATH = join(process.cwd(), "data", "maps-stats.json");

async function handleGet() {
  if (!existsSync(STATS_PATH)) {
    return NextResponse.json({ error: "No maps stats found. Run: npx tsx scripts/process-maps-data.ts" }, { status: 404 });
  }
  const data = JSON.parse(readFileSync(STATS_PATH, "utf-8"));
  return NextResponse.json(data);
}

export const GET = withApiLogging("/api/maps-stats", handleGet);
