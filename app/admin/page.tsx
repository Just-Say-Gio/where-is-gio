"use client";

import { useState, useEffect } from "react";

interface SyncStep {
  step: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
  ms?: number;
}

interface CacheStatus {
  hasData: boolean;
  lastSynced: number | null;
  segmentCount: number;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminPage() {
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: "info" | "ok" | "error" | "warn" }[]>([]);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  const addLog = (msg: string, type: "info" | "ok" | "error" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, msg, type }]);
  };

  // Fetch cache status on load
  useEffect(() => {
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((data: CacheStatus) => setCacheStatus(data))
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    addLog("Starting sync...", "info");
    addLog("Fetching from Notion API...", "info");

    try {
      const res = await fetch("/api/sync");
      const data = await res.json();

      // Log each step
      if (data.steps) {
        (data.steps as SyncStep[]).forEach((s) => {
          const timing = s.ms ? ` (${s.ms}ms)` : "";
          const detail = s.detail ? ` — ${s.detail}` : "";
          if (s.status === "ok") {
            addLog(`${s.step}${detail}${timing}`, "ok");
          } else if (s.status === "skipped") {
            addLog(`${s.step}${detail} [skipped]`, "warn");
          } else {
            addLog(`${s.step} failed${detail}`, "error");
          }
        });
      }

      if (data.success) {
        addLog(data.cached ? "Done — content unchanged, cache reused." : "Sync complete!", "ok");
      } else {
        addLog("Sync failed.", "error");
      }

      // Update cache status
      setCacheStatus({
        hasData: data.hasData,
        lastSynced: data.lastSynced,
        segmentCount: data.segmentCount,
      });
    } catch (err) {
      addLog(err instanceof Error ? err.message : "Network error", "error");
    } finally {
      setSyncing(false);
    }
  };

  const logColors = {
    info: "text-muted-foreground",
    ok: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    warn: "text-yellow-600 dark:text-yellow-400",
  };

  const statusIcon = {
    info: "○",
    ok: "✓",
    error: "✗",
    warn: "△",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-3xl">⚙️</p>
          <h1 className="text-2xl font-bold">Where Is Gio — Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manually sync travel data from Notion + Groq AI
          </p>
        </div>

        {/* Cache Status */}
        <div className="p-4 rounded-xl bg-muted/50 border space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache status</span>
            <span className="font-medium">
              {cacheStatus === null
                ? "Loading..."
                : cacheStatus.hasData
                  ? "✓ Active"
                  : "✗ Empty"}
            </span>
          </div>
          {cacheStatus?.hasData && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last synced</span>
                <span className="font-medium">
                  {cacheStatus.lastSynced
                    ? `${timeAgo(cacheStatus.lastSynced)} (${new Date(cacheStatus.lastSynced).toLocaleTimeString()})`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segments</span>
                <span className="font-medium">{cacheStatus.segmentCount}</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {syncing ? "Syncing..." : "Sync from Notion"}
        </button>

        {/* Log */}
        {logs.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/30 border font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-2 ${logColors[log.type]}`}>
                <span className="text-muted-foreground shrink-0">{log.time}</span>
                <span className="shrink-0">{statusIcon[log.type]}</span>
                <span>{log.msg}</span>
              </div>
            ))}
            {syncing && (
              <div className="flex gap-2 text-muted-foreground animate-pulse">
                <span>{new Date().toLocaleTimeString()}</span>
                <span>○</span>
                <span>Waiting for response...</span>
              </div>
            )}
          </div>
        )}

        <a
          href="/admin/hosting"
          className="block w-full py-3 px-4 rounded-xl border text-center font-semibold hover:bg-accent transition-colors"
        >
          🏠 Manage Hosting Availability
        </a>

        <div className="flex justify-center gap-4">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Back to calendar
          </a>
          <a
            href="/when"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            View /when page →
          </a>
        </div>
      </div>
    </div>
  );
}
