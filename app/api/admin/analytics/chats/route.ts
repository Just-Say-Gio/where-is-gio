import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session");

  try {
    if (sessionId) {
      // Full conversation thread for a specific session
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ sessionId, messages });
    }

    // List recent chat sessions
    const sessions = await prisma.chatMessage.groupBy({
      by: ["sessionId"],
      _count: true,
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: 50,
    });

    // Get first user message for each session
    const sessionDetails = await Promise.all(
      sessions.map(async (s) => {
        const firstMessage = await prisma.chatMessage.findFirst({
          where: { sessionId: s.sessionId, role: "user" },
          orderBy: { createdAt: "asc" },
          select: { content: true, ip: true, country: true },
        });
        return {
          sessionId: s.sessionId,
          messageCount: s._count,
          startedAt: s._min.createdAt,
          lastMessageAt: s._max.createdAt,
          firstQuestion: firstMessage?.content?.slice(0, 200) ?? null,
          ip: firstMessage?.ip ?? null,
          country: firstMessage?.country ?? null,
        };
      })
    );

    return NextResponse.json({ sessions: sessionDetails });
  } catch (err) {
    console.error("[admin/analytics/chats] Error:", err);
    return NextResponse.json({ error: "Failed to fetch chat logs" }, { status: 500 });
  }
}
