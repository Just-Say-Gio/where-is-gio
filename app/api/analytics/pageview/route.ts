import { NextRequest, NextResponse } from "next/server";
import { logPageView } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const path = body.path || "/";

  logPageView({ path, headers: req.headers });

  return NextResponse.json({ ok: true });
}
