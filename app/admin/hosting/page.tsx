"use client";

import { useState, useEffect, useCallback } from "react";

interface HostingOverride {
  available: false;
  reason: string;
}

const YEAR = 2026;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function getStartDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function HostingAdminPage() {
  const [thailandDates, setThailandDates] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, HostingOverride>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Thailand dates from cache status + segments
      const [segRes, hostRes] = await Promise.all([
        fetch("/api/segments"),
        fetch("/api/hosting"),
      ]);
      if (segRes.ok) {
        const segData = await segRes.json();
        const thDates = new Set<string>();
        for (const seg of segData.segments || []) {
          if (seg.countryCode !== "TH") continue;
          const start = new Date(seg.startDate + "T00:00:00");
          const end = new Date(seg.endDate + "T00:00:00");
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            thDates.add(
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            );
          }
        }
        setThailandDates(thDates);
      }
      if (hostRes.ok) {
        const hostData = await hostRes.json();
        setOverrides(hostData.overrides || {});
      }
    } catch {
      setMessage({ text: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDate = (dateStr: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const markUnavailable = async () => {
    if (selected.size === 0) return;
    if (!reason.trim()) {
      setMessage({ text: "Please enter a reason", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hosting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: Array.from(selected), reason: reason.trim() }),
      });
      if (res.ok) {
        setMessage({ text: `Marked ${selected.size} dates as unavailable`, type: "ok" });
        setSelected(new Set());
        setReason("");
        await fetchData();
      } else {
        setMessage({ text: "Failed to save", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const clearOverrides = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hosting", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: Array.from(selected) }),
      });
      if (res.ok) {
        setMessage({ text: `Cleared ${selected.size} overrides`, type: "ok" });
        setSelected(new Set());
        await fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  // Group overrides by reason for summary
  const overridesByReason: Record<string, string[]> = {};
  for (const [date, ov] of Object.entries(overrides)) {
    const r = ov.reason || "No reason";
    if (!overridesByReason[r]) overridesByReason[r] = [];
    overridesByReason[r].push(date);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Hosting Availability Manager</h1>
          <p className="text-sm text-muted-foreground">
            Click Thailand dates to select them, then mark as unavailable with a reason.
          </p>
        </div>

        {/* Actions bar */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Reason (private — only you see this)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Hosting John & Sarah, Personal time..."
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </div>
            <button
              onClick={markUnavailable}
              disabled={saving || selected.size === 0}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Mark unavailable ({selected.size})
            </button>
            <button
              onClick={clearOverrides}
              disabled={saving || selected.size === 0}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Clear overrides ({selected.size})
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent cursor-pointer"
            >
              Deselect all
            </button>
          </div>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {message.text}
            </p>
          )}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }, (_, m) => m).map((monthIdx) => {
            const daysInMonth = new Date(YEAR, monthIdx + 1, 0).getDate();
            const startDay = getStartDayOfWeek(YEAR, monthIdx);

            const days: string[] = [];
            for (let d = 1; d <= daysInMonth; d++) {
              days.push(
                `${YEAR}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
              );
            }

            const cells: (string | null)[] = [
              ...Array.from({ length: startDay }, () => null),
              ...days,
            ];
            while (cells.length % 7 !== 0) cells.push(null);

            const rows: (string | null)[][] = [];
            for (let i = 0; i < cells.length; i += 7) {
              rows.push(cells.slice(i, i + 7));
            }

            // Check if this month has any TH dates
            const hasTH = days.some((d) => thailandDates.has(d));

            return (
              <div key={monthIdx} className={!hasTH ? "opacity-30" : ""}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-1 tracking-wide uppercase">
                  {MONTH_NAMES[monthIdx]}
                </h3>
                <div className="flex gap-[2px] mb-[2px]">
                  {DAY_HEADERS.map((d, i) => (
                    <div
                      key={i}
                      className={`w-[26px] h-[12px] flex items-center justify-center text-[7px] font-medium ${
                        i >= 5 ? "text-muted-foreground/50" : "text-muted-foreground"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-[2px] mb-[2px]">
                    {row.map((dateStr, cellIdx) => {
                      if (!dateStr) {
                        return <div key={`e-${cellIdx}`} className="w-[26px] h-[26px]" />;
                      }

                      const dayNum = parseInt(dateStr.split("-")[2]);
                      const inTH = thailandDates.has(dateStr);
                      const isOverridden = dateStr in overrides;
                      const isSelected = selected.has(dateStr);

                      let cls = "w-[26px] h-[26px] rounded-[3px] flex items-center justify-center text-[9px] font-medium relative cursor-pointer transition-all ";

                      if (!inTH) {
                        cls += "bg-muted/20 text-muted-foreground/20 cursor-default ";
                      } else if (isOverridden) {
                        cls += "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 ";
                      } else {
                        cls += "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 ";
                      }

                      if (isSelected) {
                        cls += "!ring-2 !ring-blue-500 !ring-offset-1 !ring-offset-background ";
                      }

                      return (
                        <div
                          key={dateStr}
                          className={cls}
                          onClick={() => inTH && toggleDate(dateStr)}
                          title={
                            isOverridden
                              ? `Unavailable: ${overrides[dateStr].reason}`
                              : inTH
                                ? "Available — click to select"
                                : "Not in Thailand"
                          }
                        >
                          {dayNum}
                          {isOverridden && (
                            <span className="absolute inset-0 flex items-center justify-center text-red-500/50 text-[12px] font-bold">
                              ✕
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Current overrides summary */}
        {Object.keys(overridesByReason).length > 0 && (
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Current overrides</h2>
            {Object.entries(overridesByReason)
              .sort(([, a], [, b]) => a[0].localeCompare(b[0]))
              .map(([reasonText, dates]) => (
                <div key={reasonText} className="text-sm space-y-1">
                  <p className="font-medium text-red-600 dark:text-red-400">{reasonText}</p>
                  <p className="text-muted-foreground text-xs">
                    {dates.sort().map((d) => {
                      const parts = d.split("-");
                      return `${parts[2]}/${parts[1]}`;
                    }).join(", ")}
                    {" "}({dates.length} day{dates.length > 1 ? "s" : ""})
                  </p>
                </div>
              ))}
          </div>
        )}

        <div className="flex justify-center gap-4">
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← Back to admin
          </a>
          <a href="/when" className="text-sm text-muted-foreground hover:text-foreground underline">
            View public page →
          </a>
        </div>
      </div>
    </div>
  );
}
