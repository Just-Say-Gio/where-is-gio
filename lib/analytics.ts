import prisma from "./prisma";

// ============================================
// Helpers
// ============================================

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function parseUserAgent(ua: string | null): {
  device: string | null;
  browser: string | null;
  os: string | null;
} {
  if (!ua) return { device: null, browser: null, os: null };

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const device = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  let os: string | null = null;
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { device, browser, os };
}

// ============================================
// Fire-and-forget loggers (never await these)
// ============================================

export function logPageView(data: {
  path: string;
  headers: Headers;
  friendId?: number;
}): void {
  const ip = getClientIp(data.headers);
  const ua = data.headers.get("user-agent");
  const referer = data.headers.get("referer");
  const country = data.headers.get("cf-ipcountry") || null;
  const city = data.headers.get("x-vercel-ip-city") || null;
  const { device, browser, os } = parseUserAgent(ua);

  prisma.pageView
    .create({
      data: { path: data.path, ip, userAgent: ua, referer, country, city, device, browser, os, friendId: data.friendId ?? null },
    })
    .catch((err) => console.error("[analytics] pageView:", err));
}

export function logApiCall(data: {
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
  headers: Headers;
}): void {
  const ip = getClientIp(data.headers);
  const ua = data.headers.get("user-agent");

  prisma.apiCall
    .create({
      data: {
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        ip,
        userAgent: ua,
        durationMs: data.durationMs,
        error: data.error,
      },
    })
    .catch((err) => console.error("[analytics] apiCall:", err));
}

export function logChatMessage(data: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  durationMs?: number;
  model?: string;
  friendId?: number;
}): void {
  prisma.chatMessage
    .create({
      data: {
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        ip: data.ip,
        userAgent: data.userAgent,
        country: data.country,
        durationMs: data.durationMs,
        model: data.model,
        friendId: data.friendId ?? null,
      },
    })
    .catch((err) => console.error("[analytics] chatMessage:", err));
}

export function logEvent(data: {
  event: string;
  properties?: Record<string, string | number | boolean | null>;
  ip?: string;
  sessionId?: string;
  friendId?: number;
}): void {
  prisma.analyticsEvent
    .create({
      data: {
        event: data.event,
        properties: data.properties ? (data.properties as Record<string, string | number | boolean | null>) : undefined,
        ip: data.ip,
        sessionId: data.sessionId,
        friendId: data.friendId ?? null,
      },
    })
    .catch((err) => console.error("[analytics] event:", err));
}

// ============================================
// Persistent rate limiting (this one IS awaited)
// ============================================

const DAILY_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function checkRateLimit(
  ip: string,
  endpoint: string = "chat"
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();

    const existing = await prisma.rateLimit.findUnique({
      where: { ip_endpoint: { ip, endpoint } },
    });

    if (!existing || existing.expiresAt < now) {
      await prisma.rateLimit.upsert({
        where: { ip_endpoint: { ip, endpoint } },
        update: {
          count: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + WINDOW_MS),
        },
        create: {
          ip,
          endpoint,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + WINDOW_MS),
        },
      });
      return { allowed: true, remaining: DAILY_LIMIT - 1 };
    }

    if (existing.count >= DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    await prisma.rateLimit.update({
      where: { ip_endpoint: { ip, endpoint } },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: DAILY_LIMIT - existing.count - 1 };
  } catch (err) {
    console.error("[analytics] rateLimit check failed, allowing:", err);
    return { allowed: true, remaining: DAILY_LIMIT };
  }
}
