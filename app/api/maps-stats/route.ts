import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const STATS_PATH = join(process.cwd(), "data", "maps-stats.json");

export async function GET() {
  if (!existsSync(STATS_PATH)) {
    return NextResponse.json({ error: "No maps stats found. Run: npx tsx scripts/process-maps-data.ts" }, { status: 404 });
  }
  const data = JSON.parse(readFileSync(STATS_PATH, "utf-8"));
  return NextResponse.json(data);
}
