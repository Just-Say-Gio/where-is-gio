import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Range = "24h" | "7d" | "30d" | "all";

function getRangeDate(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
  }
}

function getTruncUnit(range: Range): string {
  switch (range) {
    case "24h": return "hour";
    case "7d":
    case "30d": return "day";
    case "all": return "week";
  }
}

async function getPageViewTrend(range: Range, since: Date | null) {
  const unit = getTruncUnit(range);
  const whereClause = since
    ? Prisma.sql`WHERE "createdAt" >= ${since}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ bucket: Date; views: bigint; visitors: bigint }>>`
    SELECT
      date_trunc(${unit}, "createdAt") AS bucket,
      COUNT(*)::bigint AS views,
      COUNT(DISTINCT ip)::bigint AS visitors
    FROM page_views
    ${whereClause}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({
    bucket: r.bucket.toISOString(),
    views: Number(r.views),
    visitors: Number(r.visitors),
  }));
}

export async function GET(req: NextRequest) {
  const range = (req.nextUrl.searchParams.get("range") ?? "7d") as Range;
  const since = getRangeDate(range);
  const where = since ? { createdAt: { gte: since } } : {};

  try {
    const [
      pageViewCount,
      uniqueVisitors,
      apiCallCount,
      chatMessageCount,
      chatSessions,
      topPages,
      topApiRoutes,
      recentEvents,
      deviceBreakdown,
      countryBreakdown,
      recentPageViews,
      pageViewTrend,
    ] = await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.groupBy({ by: ["ip"], where, _count: true }).then((r) => r.length),
      prisma.apiCall.count({ where }),
      prisma.chatMessage.count({ where }),
      prisma.chatMessage.groupBy({ by: ["sessionId"], where, _count: true }).then((r) => r.length),
      prisma.pageView.groupBy({
        by: ["path"],
        where,
        _count: true,
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.apiCall.groupBy({
        by: ["path"],
        where,
        _count: true,
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.pageView.groupBy({
        by: ["device"],
        where,
        _count: true,
      }),
      prisma.pageView.groupBy({
        by: ["country"],
        where,
        _count: true,
        orderBy: { _count: { country: "desc" } },
        take: 15,
      }),
      prisma.pageView.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { path: true, ip: true, device: true, browser: true, country: true, createdAt: true },
      }),
      getPageViewTrend(range, since),
    ]);

    return NextResponse.json({
      range,
      pageViews: pageViewCount,
      uniqueVisitors,
      apiCalls: apiCallCount,
      chatMessages: chatMessageCount,
      chatSessions,
      topPages: topPages.map((p) => ({ path: p.path, count: p._count })),
      topApiRoutes: topApiRoutes.map((r) => ({ path: r.path, count: r._count })),
      recentEvents,
      deviceBreakdown: deviceBreakdown.map((d) => ({ device: d.device ?? "unknown", count: d._count })),
      countryBreakdown: countryBreakdown.map((c) => ({ country: c.country ?? "unknown", count: c._count })),
      recentPageViews,
      pageViewTrend,
    });
  } catch (err) {
    console.error("[admin/analytics] Error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
