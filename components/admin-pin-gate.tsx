"use client";

import { useState, useEffect, useRef } from "react";

const PIN = "123456";
const COOKIE_NAME = "gio_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

function hasCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
}

function setCookie() {
  document.cookie = `${COOKIE_NAME}=true; path=/admin; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function AdminPinGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAuthed(hasCookie());
  }, []);

  useEffect(() => {
    if (authed === false) inputRef.current?.focus();
  }, [authed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === PIN) {
      setCookie();
      setAuthed(true);
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 600);
    }
  };

  // Still checking cookie
  if (authed === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-xs bg-card border rounded-2xl shadow-lg p-8 space-y-6 text-center ${
          error ? "animate-shake" : ""
        }`}
      >
        <div className="space-y-2">
          <p className="text-3xl">🔒</p>
          <h1 className="text-xl font-bold">Admin Access</h1>
          <p className="text-sm text-muted-foreground">Enter PIN to continue</p>
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className={`w-full text-center text-2xl tracking-[0.5em] px-4 py-3 rounded-xl border bg-background font-mono ${
            error ? "border-red-500 text-red-500" : ""
          }`}
          autoComplete="off"
        />

        <button
          type="submit"
          disabled={pin.length === 0}
          className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Unlock
        </button>

        {error && (
          <p className="text-sm text-red-500 font-medium">Wrong PIN</p>
        )}

        <a href="/" className="block text-sm text-muted-foreground hover:text-foreground underline">
          ← Back to calendar
        </a>
      </form>
    </div>
  );
}
