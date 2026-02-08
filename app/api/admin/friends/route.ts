import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — list all friends
export async function GET() {
  try {
    const friends = await prisma.friend.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        lastSeenAt: true,
        createdAt: true,
        inviteCode: { select: { code: true, label: true } },
      },
    });

    // Get page view counts per friend
    const viewCounts = await prisma.pageView.groupBy({
      by: ["friendId"],
      where: { friendId: { not: null } },
      _count: true,
    });
    const viewMap = new Map(viewCounts.map((v) => [v.friendId, v._count]));

    return NextResponse.json({
      friends: friends.map((f) => ({
        ...f,
        pageViews: viewMap.get(f.id) ?? 0,
      })),
    });
  } catch (err) {
    console.error("[admin/friends] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
  }
}

// DELETE — revoke friend access (delete friend record)
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.friend.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/friends] DELETE error:", err);
    return NextResponse.json({ error: "Failed to revoke friend" }, { status: 500 });
  }
}
