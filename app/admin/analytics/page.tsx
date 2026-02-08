"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminPinGate } from "@/components/admin-pin-gate";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────

interface AnalyticsData {
  range: string;
  pageViews: number;
  uniqueVisitors: number;
  apiCalls: number;
  chatMessages: number;
  chatSessions: number;
  topPages: Array<{ path: string; count: number }>;
  topApiRoutes: Array<{ path: string; count: number }>;
  recentEvents: Array<{
    id: number;
    event: string;
    properties: Record<string, unknown> | null;
    ip: string | null;
    sessionId: string | null;
    createdAt: string;
  }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  recentPageViews: Array<{
    path: string;
    ip: string | null;
    device: string | null;
    browser: string | null;
    country: string | null;
    createdAt: string;
  }>;
  pageViewTrend: Array<{ bucket: string; views: number; visitors: number }>;
}

interface ChatSession {
  sessionId: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  firstQuestion: string | null;
  ip: string | null;
  country: string | null;
}

interface ChatMessage {
  id: number;
  sessionId: string;
  role: string;
  content: string;
  ip: string | null;
  createdAt: string;
  durationMs: number | null;
  model: string | null;
}

// ─── Helpers ────────────────────────────────────────────

type Range = "24h" | "7d" | "30d" | "all";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatBucket(dateStr: string, range: Range): string {
  const d = new Date(dateStr);
  if (range === "24h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "7d") return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const DEVICE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const RANGES: { value: Range; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

// ─── Page ───────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <AdminPinGate>
      <Dashboard />
    </AdminPinGate>
  );
}

function Dashboard() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: Range) => {
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(range);
    const interval = setInterval(() => fetchData(range), 60000);
    return () => clearInterval(interval);
  }, [range, fetchData]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Where Is Gio — visitor & usage insights
            </p>
          </div>

          {/* Range selector */}
          <div className="inline-flex rounded-lg bg-muted p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  range === r.value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-sm">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground animate-pulse">Loading analytics...</div>
          </div>
        ) : data ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chats">Chat Logs</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab data={data} range={range} />
            </TabsContent>
            <TabsContent value="chats">
              <ChatLogsTab />
            </TabsContent>
            <TabsContent value="events">
              <EventsTab data={data} />
            </TabsContent>
          </Tabs>
        ) : null}

        {/* Footer nav */}
        <div className="flex justify-center gap-4 pt-4 border-t">
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← Back to admin
          </a>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← Back to calendar
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────

function OverviewTab({ data, range }: { data: AnalyticsData; range: Range }) {
  const trendData = data.pageViewTrend.map((t) => ({
    ...t,
    label: formatBucket(t.bucket, range),
  }));

  const trendConfig: ChartConfig = {
    views: { label: "Page Views", color: "hsl(var(--chart-1))" },
    visitors: { label: "Visitors", color: "hsl(var(--chart-2))" },
  };

  const barConfig: ChartConfig = {
    count: { label: "Hits", color: "hsl(var(--chart-1))" },
  };

  const totalDevices = data.deviceBreakdown.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Page Views" value={data.pageViews} gradient="rgba(59,130,246,0.12)" />
        <MetricCard label="Unique Visitors" value={data.uniqueVisitors} gradient="rgba(139,92,246,0.12)" />
        <MetricCard label="API Calls" value={data.apiCalls} gradient="rgba(16,185,129,0.12)" />
        <MetricCard label="Chat Messages" value={data.chatMessages} gradient="rgba(236,72,153,0.10)" />
        <MetricCard label="Chat Sessions" value={data.chatSessions} gradient="rgba(249,115,22,0.12)" />
      </div>

      {/* Page View Trend */}
      {trendData.length > 0 ? (
        <MagicCard gradientColor="rgba(59,130,246,0.08)" className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Traffic Trend
          </p>
          <ChartContainer config={trendConfig} className="h-[250px] w-full">
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--chart-1))"
                fill="url(#fillViews)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--chart-2))"
                fill="url(#fillVisitors)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </MagicCard>
      ) : (
        <EmptyState message="No traffic data for this period" />
      )}

      {/* Two-column: Device Donut + Top Pages Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Breakdown */}
        <MagicCard gradientColor="rgba(139,92,246,0.08)" className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Devices
          </p>
          {totalDevices > 0 ? (
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.deviceBreakdown}
                    dataKey="count"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {data.deviceBreakdown.map((_, i) => (
                      <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalDevices}</div>
                  <div className="text-[10px] text-muted-foreground">total</div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No device data" />
          )}
          {totalDevices > 0 && (
            <div className="flex justify-center gap-4 mt-2">
              {data.deviceBreakdown.map((d, i) => (
                <div key={d.device} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                  />
                  {d.device} ({d.count})
                </div>
              ))}
            </div>
          )}
        </MagicCard>

        {/* Top Pages */}
        <MagicCard gradientColor="rgba(16,185,129,0.08)" className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Top Pages
          </p>
          {data.topPages.length > 0 ? (
            <ChartContainer config={barConfig} className="h-[230px] w-full">
              <BarChart
                data={data.topPages}
                layout="vertical"
                margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="path"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 18) + "..." : v)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyState message="No page data" />
          )}
        </MagicCard>
      </div>

      {/* Country Breakdown */}
      {data.countryBreakdown.length > 0 && (
        <MagicCard gradientColor="rgba(249,115,22,0.08)" className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Countries
          </p>
          <CountryBar data={data.countryBreakdown} />
        </MagicCard>
      )}

      {/* Top API Routes */}
      {data.topApiRoutes.length > 0 && (
        <MagicCard gradientColor="rgba(16,185,129,0.06)" className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            API Routes
          </p>
          <div className="space-y-2">
            {data.topApiRoutes.map((r) => (
              <div key={r.path} className="flex items-center justify-between text-sm">
                <code className="text-xs font-mono text-muted-foreground">{r.path}</code>
                <span className="font-medium tabular-nums">{r.count}</span>
              </div>
            ))}
          </div>
        </MagicCard>
      )}

      {/* Recent Page Views */}
      {data.recentPageViews.length > 0 && (
        <MagicCard gradientColor="rgba(59,130,246,0.04)" className="p-4 sm:p-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
            Recent Visitors
          </p>
          <ScrollArea className="h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-2 font-medium">Time</th>
                  <th className="text-left pb-2 font-medium">Path</th>
                  <th className="text-left pb-2 font-medium hidden sm:table-cell">Device</th>
                  <th className="text-left pb-2 font-medium hidden sm:table-cell">Browser</th>
                  <th className="text-left pb-2 font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPageViews.map((pv, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5 text-muted-foreground text-xs font-mono whitespace-nowrap">
                      {timeAgo(pv.createdAt)}
                    </td>
                    <td className="py-1.5 font-mono text-xs max-w-[200px] truncate">{pv.path}</td>
                    <td className="py-1.5 text-muted-foreground text-xs capitalize hidden sm:table-cell">
                      {pv.device ?? "—"}
                    </td>
                    <td className="py-1.5 text-muted-foreground text-xs hidden sm:table-cell">
                      {pv.browser ?? "—"}
                    </td>
                    <td className="py-1.5 text-xs">{pv.country ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </MagicCard>
      )}
    </div>
  );
}

// ─── Chat Logs Tab ──────────────────────────────────────

function ChatLogsTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics/chats")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  const openSession = async (sid: string) => {
    setActiveSession(sid);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/admin/analytics/chats?session=${sid}`);
      const d = await res.json();
      setMessages(d.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  if (loadingSessions) {
    return <div className="text-center text-muted-foreground py-12 animate-pulse">Loading chat sessions...</div>;
  }

  if (sessions.length === 0) {
    return <EmptyState message="No chat sessions recorded yet" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
      {/* Session list */}
      <MagicCard gradientColor="rgba(236,72,153,0.06)" className="p-3">
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3 px-1">
          Sessions ({sessions.length})
        </p>
        <ScrollArea className="h-[500px]">
          <div className="space-y-1">
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => openSession(s.sessionId)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeSession === s.sessionId
                    ? "bg-foreground/10 border border-border"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{timeAgo(s.startedAt)}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                    {s.messageCount} msg{s.messageCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">
                  {s.firstQuestion ?? <span className="italic text-muted-foreground">No question</span>}
                </p>
                {s.country && (
                  <span className="text-[10px] text-muted-foreground mt-1 block">{s.country}</span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </MagicCard>

      {/* Conversation thread */}
      <MagicCard gradientColor="rgba(236,72,153,0.04)" className="p-3">
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3 px-1">
          Conversation
        </p>
        {!activeSession ? (
          <div className="flex items-center justify-center h-[500px] text-sm text-muted-foreground">
            Select a session to view
          </div>
        ) : loadingThread ? (
          <div className="flex items-center justify-center h-[500px] text-sm text-muted-foreground animate-pulse">
            Loading...
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 p-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-foreground/10 text-foreground"
                        : "bg-muted border text-foreground"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex gap-2 mt-1.5 text-[10px] text-muted-foreground/60">
                      <span>{timeAgo(msg.createdAt)}</span>
                      {msg.durationMs && <span>{msg.durationMs}ms</span>}
                      {msg.model && <span>{msg.model}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </MagicCard>
    </div>
  );
}

// ─── Events Tab ─────────────────────────────────────────

function EventsTab({ data }: { data: AnalyticsData }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (data.recentEvents.length === 0) {
    return <EmptyState message="No events recorded yet" />;
  }

  return (
    <MagicCard gradientColor="rgba(139,92,246,0.06)" className="p-4 sm:p-6">
      <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
        Recent Events
      </p>
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {data.recentEvents.map((ev) => (
            <div key={ev.id} className="p-3 rounded-lg border border-border/40 hover:border-border/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">{ev.event}</span>
                  {ev.sessionId && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {ev.sessionId.slice(0, 12)}...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {ev.ip && <span>{ev.ip}</span>}
                  <span>{timeAgo(ev.createdAt)}</span>
                </div>
              </div>
              {ev.properties && (
                <button
                  onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-1 underline"
                >
                  {expanded === ev.id ? "Hide" : "Show"} properties
                </button>
              )}
              {expanded === ev.id && ev.properties && (
                <pre className="mt-2 p-2 rounded bg-muted/50 text-[10px] font-mono overflow-x-auto">
                  {JSON.stringify(ev.properties, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </MagicCard>
  );
}

// ─── Shared Components ──────────────────────────────────

function MetricCard({ label, value, gradient }: { label: string; value: number; gradient: string }) {
  return (
    <MagicCard gradientColor={gradient} className="p-4 text-center">
      <div className="text-2xl sm:text-3xl font-bold">
        {value > 0 ? <NumberTicker value={value} /> : "0"}
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{label}</p>
    </MagicCard>
  );
}

function CountryBar({ data }: { data: Array<{ country: string; count: number }> }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-2">
      <div
        className="flex h-8 rounded-lg overflow-hidden"
        onMouseLeave={() => setHovered(null)}
      >
        {data.map((d) => {
          const pct = (d.count / total) * 100;
          const isHovered = hovered === d.country;
          let width: number;
          if (!hovered) {
            width = pct;
          } else if (isHovered) {
            width = 70;
          } else {
            const hoveredPct = (data.find((x) => x.country === hovered)?.count ?? 0) / total * 100;
            width = (pct / (100 - hoveredPct)) * 30;
          }
          return (
            <div
              key={d.country}
              className="flex items-center justify-center text-[10px] font-medium transition-all duration-300 cursor-default"
              style={{
                width: `${width}%`,
                backgroundColor: `hsl(var(--chart-${(data.indexOf(d) % 5) + 1}))`,
                opacity: hovered && !isHovered ? 0.5 : 1,
              }}
              onMouseEnter={() => setHovered(d.country)}
            >
              {(isHovered || pct >= 10) && (
                <span className="text-white drop-shadow-sm truncate px-1">
                  {d.country} ({d.count})
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((d, i) => (
          <span key={d.country} className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: `hsl(var(--chart-${(i % 5) + 1}))` }}
            />
            {d.country} ({d.count})
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border border-dashed rounded-xl">
      {message}
    </div>
  );
}
