import { NextRequest, NextResponse } from "next/server";
import { logEvent, getClientIp } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.event) {
    return NextResponse.json({ error: "event required" }, { status: 400 });
  }

  logEvent({
    event: body.event,
    properties: body.properties,
    ip: getClientIp(req.headers),
    sessionId: body.sessionId,
    friendId: typeof body.friendId === "number" ? body.friendId : undefined,
  });

  return NextResponse.json({ ok: true });
}
