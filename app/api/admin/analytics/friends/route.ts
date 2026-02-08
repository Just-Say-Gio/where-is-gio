import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const friendIdParam = req.nextUrl.searchParams.get("friendId");

  try {
    if (friendIdParam) {
      // Single friend activity timeline
      const friendId = parseInt(friendIdParam, 10);
      if (isNaN(friendId)) {
        return NextResponse.json({ error: "Invalid friendId" }, { status: 400 });
      }

      const friend = await prisma.friend.findUnique({
        where: { id: friendId },
        include: { inviteCode: { select: { code: true, label: true } } },
      });

      if (!friend) {
        return NextResponse.json({ error: "Friend not found" }, { status: 404 });
      }

      const [pageViews, chatMessages, events] = await Promise.all([
        prisma.pageView.findMany({
          where: { friendId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { path: true, device: true, country: true, createdAt: true },
        }),
        prisma.chatMessage.findMany({
          where: { friendId, role: "user" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { content: true, createdAt: true, sessionId: true },
        }),
        prisma.analyticsEvent.findMany({
          where: { friendId },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { event: true, properties: true, ip: true, createdAt: true },
        }),
      ]);

      return NextResponse.json({
        friend: {
          id: friend.id,
          displayName: friend.displayName,
          lastSeenAt: friend.lastSeenAt,
          createdAt: friend.createdAt,
          inviteCode: friend.inviteCode,
        },
        pageViews,
        chatMessages: chatMessages.map((m) => ({
          ...m,
          content: m.content.slice(0, 200),
        })),
        events,
      });
    }

    // List all friends with activity counts
    const friends = await prisma.friend.findMany({
      orderBy: { lastSeenAt: "desc" },
      include: { inviteCode: { select: { code: true, label: true } } },
    });

    const friendIds = friends.map((f) => f.id);

    const [pageViewCounts, chatSessionCounts, loginEvents] = await Promise.all([
      prisma.pageView.groupBy({
        by: ["friendId"],
        where: { friendId: { in: friendIds } },
        _count: true,
      }),
      prisma.chatMessage.groupBy({
        by: ["friendId"],
        where: { friendId: { in: friendIds }, role: "user" },
        _count: true,
      }),
      prisma.analyticsEvent.findMany({
        where: { friendId: { in: friendIds }, event: "friend_login" },
        orderBy: { createdAt: "desc" },
        select: { friendId: true, createdAt: true },
      }),
    ]);

    const pvMap = new Map(pageViewCounts.map((p) => [p.friendId!, p._count]));
    const chatMap = new Map(chatSessionCounts.map((c) => [c.friendId!, c._count]));

    // Group login events by friendId
    const loginMap = new Map<number, { count: number; lastLoginAt: Date | null }>();
    for (const ev of loginEvents) {
      if (ev.friendId === null) continue;
      const existing = loginMap.get(ev.friendId);
      if (!existing) {
        loginMap.set(ev.friendId, { count: 1, lastLoginAt: ev.createdAt });
      } else {
        existing.count++;
      }
    }

    const enrichedFriends = friends.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      lastSeenAt: f.lastSeenAt,
      createdAt: f.createdAt,
      inviteCode: f.inviteCode,
      pageViews: pvMap.get(f.id) ?? 0,
      chatMessages: chatMap.get(f.id) ?? 0,
      loginCount: loginMap.get(f.id)?.count ?? 0,
      lastLoginAt: loginMap.get(f.id)?.lastLoginAt ?? null,
    }));

    return NextResponse.json({ friends: enrichedFriends });
  } catch (err) {
    console.error("[admin/analytics/friends] Error:", err);
    return NextResponse.json({ error: "Failed to fetch friends data" }, { status: 500 });
  }
}
