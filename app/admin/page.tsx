"use client";

import { useState } from "react";

export default function AdminPage() {
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("syncing");
    setResult(null);
    try {
      const res = await fetch("/api/sync");
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setResult(
          data.cached
            ? "Content unchanged — using cached data."
            : `Synced ${data.segmentCount} travel segments from Notion.`
        );
      } else {
        setStatus("error");
        setResult(data.details || data.error || "Unknown error");
      }
    } catch (err) {
      setStatus("error");
      setResult(err instanceof Error ? err.message : "Network error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-3xl">⚙️</p>
          <h1 className="text-2xl font-bold">Where Is Gio — Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manually sync travel data from Notion + Groq AI
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={status === "syncing"}
          className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === "syncing" ? "Syncing..." : "Sync from Notion"}
        </button>

        {result && (
          <div
            className={`p-4 rounded-xl text-sm ${
              status === "success"
                ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
            }`}
          >
            {result}
          </div>
        )}

        <a
          href="/"
          className="block text-center text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Back to calendar
        </a>
      </div>
    </div>
  );
}
