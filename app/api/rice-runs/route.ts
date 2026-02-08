import { NextRequest, NextResponse } from "next/server";
import { getRiceRunData, setRiceRuns, removeRiceRuns } from "@/lib/rice-runs";
import { withApiLogging } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

async function handleGet() {
  return NextResponse.json(getRiceRunData());
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { dates, note } = body as { dates: string[]; note?: string };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "dates array required" }, { status: 400 });
    }

    setRiceRuns(dates, note);
    return NextResponse.json({ success: true, count: dates.length });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json();
    const { dates } = body as { dates: string[] };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "dates array required" }, { status: 400 });
    }

    removeRiceRuns(dates);
    return NextResponse.json({ success: true, count: dates.length });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export const GET = withApiLogging("/api/rice-runs", handleGet);
export const POST = withApiLogging("/api/rice-runs", handlePost);
export const DELETE = withApiLogging("/api/rice-runs", handleDelete);
