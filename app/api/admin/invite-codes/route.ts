import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateInviteCode } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list all invite codes
export async function GET() {
  try {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        friends: {
          select: { id: true, displayName: true, lastSeenAt: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({ codes });
  } catch (err) {
    console.error("[admin/invite-codes] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch invite codes" }, { status: 500 });
  }
}

// POST — create new invite code
export async function POST(req: NextRequest) {
  try {
    const { label, maxUses, expiresAt } = await req.json();

    // Generate unique code (retry if collision)
    let code: string;
    let attempts = 0;
    do {
      code = generateInviteCode();
      attempts++;
    } while (
      (await prisma.inviteCode.findUnique({ where: { code } })) !== null &&
      attempts < 10
    );

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        label: label || null,
        maxUses: maxUses ?? 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ success: true, inviteCode });
  } catch (err) {
    console.error("[admin/invite-codes] POST error:", err);
    return NextResponse.json({ error: "Failed to create invite code" }, { status: 500 });
  }
}

// DELETE — delete an invite code
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.inviteCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/invite-codes] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete invite code" }, { status: 500 });
  }
}
