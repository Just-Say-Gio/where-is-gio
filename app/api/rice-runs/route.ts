import { NextRequest, NextResponse } from "next/server";
import { getRiceRunData, setRiceRuns, removeRiceRuns } from "@/lib/rice-runs";

export const dynamic = "force-dynamic";

// GET — return all rice runs
export async function GET() {
  return NextResponse.json(getRiceRunData());
}

// POST — add rice runs for given dates
export async function POST(request: NextRequest) {
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

// DELETE — remove rice runs for given dates
export async function DELETE(request: NextRequest) {
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
