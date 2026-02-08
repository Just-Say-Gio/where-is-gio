import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPin, generateSessionToken } from "@/lib/auth";
import { checkRateLimit, logEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Rate limit: 10 registration attempts per 24h per IP
  const { allowed } = await checkRateLimit(ip, "register");
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again tomorrow." }, { status: 429 });
  }

  try {
    const { code, displayName, pin } = await req.json();

    if (!code || !displayName || !pin) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof pin !== "string" || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }

    const trimmedName = displayName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 30) {
      return NextResponse.json({ error: "Name must be 1-30 characters" }, { status: 400 });
    }

    // Validate invite code
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!inviteCode) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
    }

    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return NextResponse.json({ error: "Invite code has been fully used" }, { status: 400 });
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
    }

    // Check if displayName is taken (case-insensitive)
    const existing = await prisma.friend.findFirst({
      where: { displayName: { equals: trimmedName, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "That name is already taken" }, { status: 409 });
    }

    // Create friend
    const sessionToken = generateSessionToken();
    const pinHash = await hashPin(pin);

    const friend = await prisma.friend.create({
      data: {
        displayName: trimmedName,
        pinHash,
        sessionToken,
        inviteCodeId: inviteCode.id,
      },
    });

    // Increment invite code usage
    await prisma.inviteCode.update({
      where: { id: inviteCode.id },
      data: { usedCount: { increment: 1 } },
    });

    // Log registration event (fire-and-forget)
    logEvent({
      event: "friend_register",
      friendId: friend.id,
      ip,
      properties: { displayName: trimmedName, inviteCode: inviteCode.code },
    });

    const response = NextResponse.json({
      success: true,
      friendId: friend.id,
      displayName: friend.displayName,
    });

    // Set session cookie — 1 year, path /, SameSite Lax
    response.cookies.set("gio_session", sessionToken, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false, // readable by client JS for presence check
    });

    return response;
  } catch (err) {
    console.error("[auth/register] Error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
