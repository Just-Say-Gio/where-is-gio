"use client";

import { useState, useEffect, ReactNode } from "react";
import Image from "next/image";

const COOKIE_NAME = "gio_friend";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

const CAR_BRANDS = [
  { name: "BMW", domain: "bmw.com" },
  { name: "Mercedes-Benz", domain: "mercedes-benz.com" },
  { name: "Audi", domain: "audi.com" },
  { name: "Toyota", domain: "toyota.com" },
  { name: "Honda", domain: "honda.com" },
  { name: "Ford", domain: "ford.com" },
  { name: "Skoda", domain: "skoda-auto.com" },
  { name: "Volkswagen", domain: "volkswagen.com" },
  { name: "Ferrari", domain: "ferrari.com" },
  { name: "Porsche", domain: "porsche.com" },
];

const COUNTRIES = [
  { name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  { name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}" },
  { name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  { name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}" },
  { name: "Italy", flag: "\u{1F1EE}\u{1F1F9}" },
];

const WRONG_CAR_MESSAGES = [
  "Nope! Are you sure you know Gio?",
  "Not even close!",
  "Really? Try harder.",
  "Gio would be disappointed...",
  "That's a nice car, but not THE car.",
  "You clearly haven't been in Gio's car.",
  "Wrong! Think more... Czech.",
  "Swing and a miss!",
];

const WRONG_COUNTRY_MESSAGES = [
  "Nope! Think about baguettes...",
  "Wrong country! Gio has opinions.",
  "Not that one. Think croissants.",
  "Try again! Hint: oui oui.",
  "That country can stay. For now.",
  "Gio would disagree with that choice.",
];

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [step, setStep] = useState<1 | 2 | "celebrating">(1);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [flagRain, setFlagRain] = useState(false);

  useEffect(() => {
    setAuthed(getCookie(COOKIE_NAME) === "true");
  }, []);

  // Still checking cookie
  if (authed === null) return null;
  // Already authenticated
  if (authed) return <>{children}</>;

  const handleCarClick = (brand: string) => {
    if (brand === "Skoda") {
      setError(null);
      setStep(2);
    } else {
      const msg = WRONG_CAR_MESSAGES[msgIndex % WRONG_CAR_MESSAGES.length];
      setMsgIndex((i) => i + 1);
      setError(msg);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  const handleCountryClick = (country: string) => {
    if (country === "France") {
      setError(null);
      setStep("celebrating");
      setFlagRain(true);
      setTimeout(() => {
        setCookie(COOKIE_NAME, "true", COOKIE_MAX_AGE);
        setAuthed(true);
      }, 2500);
    } else {
      const msg = WRONG_COUNTRY_MESSAGES[msgIndex % WRONG_COUNTRY_MESSAGES.length];
      setMsgIndex((i) => i + 1);
      setError(msg);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
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
        <div
          className={`
            w-full max-w-lg bg-card border rounded-2xl shadow-2xl p-6 sm:p-8
            transition-transform duration-300
            ${shaking ? "animate-shake" : ""}
          `}
        >
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-2xl">🔒</p>
                <h2 className="text-xl sm:text-2xl font-bold">
                  Hold up! Friends only.
                </h2>
                <p className="text-muted-foreground text-sm">
                  What is Gio&apos;s favourite car company?
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {CAR_BRANDS.map((brand) => (
                  <button
                    key={brand.name}
                    onClick={() => handleCarClick(brand.name)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-background hover:bg-accent hover:border-foreground/20 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex items-center justify-center">
                      <Image
                        src={`https://logo.clearbit.com/${brand.domain}`}
                        alt={brand.name}
                        width={48}
                        height={48}
                        className="object-contain group-hover:scale-110 transition-transform"
                        unoptimized
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      {brand.name}
                    </span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-500 font-medium">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-2xl">🌍</p>
                <h2 className="text-xl sm:text-2xl font-bold">
                  Almost there...
                </h2>
                <p className="text-muted-foreground text-sm">
                  If one country could disappear tomorrow, which one would it be?
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.name}
                    onClick={() => handleCountryClick(country.name)}
                    className="flex items-center gap-2 p-3 rounded-xl border bg-background hover:bg-accent hover:border-foreground/20 transition-all cursor-pointer"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-sm font-medium">{country.name}</span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-500 font-medium">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "celebrating" && (
            <div className="text-center space-y-4 py-6">
              <p className="text-5xl">🇫🇷</p>
              <h2 className="text-xl sm:text-2xl font-bold">
                They&apos;re all okay... for now
              </h2>
              <p className="text-muted-foreground text-sm">
                Welcome in, friend! 🤝
              </p>
            </div>
          )}
        </div>

        {/* Flag rain */}
        {flagRain && (
          <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-2xl sm:text-3xl animate-flag-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${1.5 + Math.random() * 2}s`,
                }}
              >
                🇫🇷
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
