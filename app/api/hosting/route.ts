import { NextRequest, NextResponse } from "next/server";
import { getHostingData, setHostingOverrides, removeHostingOverrides } from "@/lib/hosting";

export const dynamic = "force-dynamic";

// GET — return all overrides
export async function GET() {
  return NextResponse.json(getHostingData());
}

// POST — add/update overrides for given dates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dates, reason } = body as { dates: string[]; reason: string };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "dates array required" }, { status: 400 });
    }
    if (typeof reason !== "string") {
      return NextResponse.json({ error: "reason string required" }, { status: 400 });
    }

    setHostingOverrides(dates, reason);
    return NextResponse.json({ success: true, count: dates.length });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// DELETE — remove overrides for given dates
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { dates } = body as { dates: string[] };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "dates array required" }, { status: 400 });
    }

    removeHostingOverrides(dates);
    return NextResponse.json({ success: true, count: dates.length });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
