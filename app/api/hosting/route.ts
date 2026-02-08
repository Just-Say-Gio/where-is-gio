import { NextRequest, NextResponse } from "next/server";
import { getHostingData, setHostingOverrides, removeHostingOverrides } from "@/lib/hosting";
import { withApiLogging } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

async function handleGet() {
  return NextResponse.json(getHostingData());
}

async function handlePost(request: NextRequest) {
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

async function handleDelete(request: NextRequest) {
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

export const GET = withApiLogging("/api/hosting", handleGet);
export const POST = withApiLogging("/api/hosting", handlePost);
export const DELETE = withApiLogging("/api/hosting", handleDelete);
