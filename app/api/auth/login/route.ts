import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPin, generateSessionToken } from "@/lib/auth";
import { checkRateLimit, logEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Rate limit: 10 login attempts per 24h per IP
  const { allowed } = await checkRateLimit(ip, "login");
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again tomorrow." }, { status: 429 });
  }

  try {
    const { displayName, pin } = await req.json();

    if (!displayName || !pin) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find friend by name (case-insensitive)
    const friend = await prisma.friend.findFirst({
      where: { displayName: { equals: displayName.trim(), mode: "insensitive" } },
    });

    if (!friend) {
      return NextResponse.json({ error: "Name not found" }, { status: 401 });
    }

    const valid = await verifyPin(pin, friend.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }

    // Generate new session token (invalidates old sessions on other devices)
    const sessionToken = generateSessionToken();

    await prisma.friend.update({
      where: { id: friend.id },
      data: { sessionToken, lastSeenAt: new Date() },
    });

    // Log login event (fire-and-forget)
    logEvent({
      event: "friend_login",
      friendId: friend.id,
      ip,
      properties: { displayName: friend.displayName },
    });

    const response = NextResponse.json({
      success: true,
      friendId: friend.id,
      displayName: friend.displayName,
    });

    response.cookies.set("gio_session", sessionToken, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error("[auth/login] Error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
