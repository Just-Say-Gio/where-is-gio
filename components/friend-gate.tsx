"use client";

import { useState, useEffect, ReactNode } from "react";
import { useFriend } from "@/lib/friend-context";

type View = "loading" | "gate" | "code" | "register" | "login" | "welcome";

interface FriendGateProps {
  children: ReactNode;
  /** When true, unauthenticated users see WhatsApp CTA instead of login */
  whatsappFallback?: boolean;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const WHATSAPP_URL = "https://api.whatsapp.com/send?phone=31636551497&text=Hey%20Gio!%20I%27d%20love%20to%20get%20access%20to%20Where%20Is%20Gio%20%F0%9F%8C%8D";

export function FriendGate({ children, whatsappFallback = false }: FriendGateProps) {
  const { isAuthed, setFriend } = useFriend();
  const [view, setView] = useState<View>("loading");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  useEffect(() => {
    const token = getCookie("gio_session");
    const storedName = localStorage.getItem("gio_friend_name");
    const storedId = localStorage.getItem("gio_friend_id");
    if (token && storedName && storedId) {
      setView("loading"); // will render children via isAuthed
    } else {
      setView("gate");
    }
  }, []);

  // If FriendContext already authed (from provider), render children
  if (isAuthed) return <>{children}</>;
  // Still loading cookie check
  if (view === "loading") return null;

  const handleCodeSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Quick pre-validate format
      const trimmed = code.trim().toUpperCase();
      if (!trimmed || trimmed.length < 4) {
        setError("Enter a valid invite code");
        setLoading(false);
        return;
      }
      // Move to register form — actual code validation happens on register submit
      setCode(trimmed);
      setView("register");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, displayName: name.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        // If code is invalid, go back to code entry
        if (data.error?.includes("invite code") || data.error?.includes("Invalid")) {
          setView("code");
        }
        return;
      }
      setFriend(data.friendId, data.displayName);
      setWelcomeName(data.displayName);
      setView("welcome");
      setTimeout(() => {
        // Force re-render as authed — context already set
        window.location.reload();
      }, 1500);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      setFriend(data.friendId, data.displayName);
      setWelcomeName(data.displayName);
      setView("welcome");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none blur-lg opacity-30">
        {children}
      </div>

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-card border rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Gate — initial view */}
          {view === "gate" && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-3xl">🔒</p>
                <h2 className="text-xl sm:text-2xl font-bold">Friends Only</h2>
                <p className="text-muted-foreground text-sm">
                  You need an invite code to access Where Is Gio
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setError(null); setView("code"); }}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm"
                >
                  I have an invite code
                </button>
                <button
                  onClick={() => { setError(null); setName(""); setPin(""); setView("login"); }}
                  className="w-full py-3 px-4 rounded-xl border font-semibold hover:bg-accent transition-colors cursor-pointer text-sm"
                >
                  I already registered
                </button>
              </div>

              <div className="text-center pt-2">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Don&apos;t have a code? Message Gio on WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Code entry */}
          {view === "code" && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-3xl">🎟️</p>
                <h2 className="text-xl sm:text-2xl font-bold">Enter Invite Code</h2>
                <p className="text-muted-foreground text-sm">
                  Ask Gio for your personal invite code
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="GIO-XXXX"
                  className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-lg tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={8}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                />
                <button
                  onClick={handleCodeSubmit}
                  disabled={loading || !code.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center font-medium">{error}</p>
              )}

              <button
                onClick={() => { setError(null); setView("gate"); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Register — name + PIN */}
          {view === "register" && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-3xl">👋</p>
                <h2 className="text-xl sm:text-2xl font-bold">Welcome!</h2>
                <p className="text-muted-foreground text-sm">
                  Set your display name and a PIN to log back in
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    className="w-full px-4 py-3 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={30}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">PIN (4-6 digits)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-lg tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && name.trim() && pin.length >= 4 && handleRegister()}
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={loading || !name.trim() || pin.length < 4}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account..." : "Register"}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center font-medium">{error}</p>
              )}

              <button
                onClick={() => { setError(null); setView("code"); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Login — returning user */}
          {view === "login" && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-3xl">👋</p>
                <h2 className="text-xl sm:text-2xl font-bold">Welcome Back</h2>
                <p className="text-muted-foreground text-sm">
                  Enter your name and PIN
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={30}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••"
                    className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-lg tracking-widest placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && name.trim() && pin.length >= 4 && handleLogin()}
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading || !name.trim() || pin.length < 4}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center font-medium">{error}</p>
              )}

              <button
                onClick={() => { setError(null); setView("gate"); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Welcome — post-auth celebration */}
          {view === "welcome" && (
            <div className="text-center space-y-4 py-6">
              <p className="text-5xl">🎉</p>
              <h2 className="text-xl sm:text-2xl font-bold">
                Hey {welcomeName}!
              </h2>
              <p className="text-muted-foreground text-sm">
                Welcome in — loading your calendar...
              </p>
            </div>
          )}
        </div>

        {/* WhatsApp fallback for when-can-I-stay (unauthenticated) */}
        {whatsappFallback && view === "gate" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 text-white font-semibold shadow-lg hover:bg-green-700 transition-colors text-sm"
            >
              <span>💬</span> Message Gio on WhatsApp
            </a>
          </div>
        )}
      </div>
    </>
  );
}
