"use client";

import { useState, useEffect } from "react";
import { AdminPinGate } from "@/components/admin-pin-gate";

interface InviteCode {
  id: number;
  code: string;
  label: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
  friends: { id: number; displayName: string; lastSeenAt: string; createdAt: string }[];
}

interface Friend {
  id: number;
  displayName: string;
  lastSeenAt: string;
  createdAt: string;
  inviteCode: { code: string; label: string | null };
  pageViews: number;
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function FriendsAdminPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, friendsRes] = await Promise.all([
        fetch("/api/admin/invite-codes"),
        fetch("/api/admin/friends"),
      ]);
      const codesData = await codesRes.json();
      const friendsData = await friendsRes.json();
      setCodes(codesData.codes ?? []);
      setFriends(friendsData.friends ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCode = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() || null, maxUses: newMaxUses }),
      });
      if (res.ok) {
        setNewLabel("");
        setNewMaxUses(1);
        fetchData();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCode = async (id: number) => {
    if (!confirm("Delete this invite code?")) return;
    await fetch("/api/admin/invite-codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const handleRevokeFriend = async (id: number, name: string) => {
    if (!confirm(`Revoke access for ${name}?`)) return;
    await fetch("/api/admin/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AdminPinGate>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Invite Codes & Friends</h1>
            <p className="text-sm text-muted-foreground">
              Generate invite codes and manage registered friends
            </p>
          </div>

          {/* Generate new code */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <h2 className="font-semibold text-sm">Generate New Invite Code</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (e.g. For Mike)"
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={100}
                className="w-20 px-3 py-2 rounded-lg border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                title="Max uses"
              />
              <button
                onClick={handleCreateCode}
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {creating ? "..." : "Generate"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              {/* Invite codes table */}
              <div className="space-y-3">
                <h2 className="font-semibold text-sm">Invite Codes ({codes.length})</h2>
                {codes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invite codes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {codes.map((ic) => (
                      <div key={ic.id} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyCode(ic.code)}
                              className="font-mono text-sm font-bold hover:text-primary cursor-pointer"
                              title="Click to copy"
                            >
                              {ic.code}
                            </button>
                            {copied === ic.code && (
                              <span className="text-xs text-green-500">Copied!</span>
                            )}
                            {ic.label && (
                              <span className="text-xs text-muted-foreground">({ic.label})</span>
                            )}
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{ic.usedCount}/{ic.maxUses} used</span>
                            <span>{timeAgo(ic.createdAt)}</span>
                            {ic.expiresAt && new Date(ic.expiresAt) < new Date() && (
                              <span className="text-red-500">Expired</span>
                            )}
                          </div>
                          {ic.friends.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Used by: {ic.friends.map((f) => f.displayName).join(", ")}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCode(ic.id)}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Friends table */}
              <div className="space-y-3">
                <h2 className="font-semibold text-sm">Registered Friends ({friends.length})</h2>
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No friends registered yet.</p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((f) => (
                      <div key={f.id} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{f.displayName}</div>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>Code: {f.inviteCode.code}</span>
                            <span>Joined {timeAgo(f.createdAt)}</span>
                            <span>Last seen {timeAgo(f.lastSeenAt)}</span>
                            <span>{f.pageViews} views</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeFriend(f.id, f.displayName)}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0 cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-center gap-4">
            <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground underline">
              ← Back to Admin
            </a>
          </div>
        </div>
      </div>
    </AdminPinGate>
  );
}
