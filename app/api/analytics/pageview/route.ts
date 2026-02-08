import { NextRequest, NextResponse } from "next/server";
import { logPageView } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const path = body.path || "/";
  const friendId = typeof body.friendId === "number" ? body.friendId : undefined;

  logPageView({ path, headers: req.headers, friendId });

  return NextResponse.json({ ok: true });
}
