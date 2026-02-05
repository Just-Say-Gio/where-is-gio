"use client";

import { useState, useEffect, ReactNode } from "react";
import Image from "next/image";

const COOKIE_NAME = "gio_friend";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

const CAR_BRANDS = [
  { name: "BMW", logo: "https://vl.imgix.net/img/bmw-logo.png" },
  { name: "Mercedes-Benz", logo: "https://vl.imgix.net/img/mercedes-benz-logo.png" },
  { name: "Audi", logo: "https://vl.imgix.net/img/audi-logo.png" },
  { name: "Toyota", logo: "https://vl.imgix.net/img/toyota-logo.png" },
  { name: "Honda", logo: "https://vl.imgix.net/img/honda-logo.png" },
  { name: "Renault", logo: "https://vl.imgix.net/img/renault-logo.png" },
  { name: "Skoda", logo: "https://vl.imgix.net/img/skoda-logo.png" },
  { name: "Volkswagen", logo: "https://vl.imgix.net/img/volkswagen-logo.png" },
  { name: "Ferrari", logo: "https://vl.imgix.net/img/ferrari-logo.png" },
  { name: "Porsche", logo: "https://vl.imgix.net/img/porsche-logo.png" },
];

const F1_DRIVERS = [
  { name: "Lewis Hamilton", number: 44 },
  { name: "Max Verstappen", number: 1 },
  { name: "Charles Leclerc", number: 16 },
  { name: "Lando Norris", number: 4 },
  { name: "Carlos Sainz", number: 55 },
  { name: "Oscar Piastri", number: 81 },
  { name: "George Russell", number: 63 },
  { name: "Fernando Alonso", number: 14 },
  { name: "Pierre Gasly", number: 10 },
  { name: "Sergio Pérez", number: 11 },
];

// The joke: ALL options are France
const COUNTRIES = [
  { name: "Germany", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "United Kingdom", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "United States", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "Netherlands", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "Italy", flag: "\u{1F1EB}\u{1F1F7}" },
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

const WRONG_F1_MESSAGES = [
  "Wrong! Do you even watch F1?",
  "Nope. Think more... orange.",
  "That's not the GOAT.",
  "Simply simply simply... wrong.",
  "Are you a Netflix fan or a real fan?",
  "MAX MAX MAX SUPER... not that guy.",
  "Wrong driver! Think Dutch.",
  "No no no, that was so not right!",
];

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

type Step = 1 | 2 | 3 | "supermax" | "celebrating";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [step, setStep] = useState<Step>(1);
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

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleCarClick = (brand: string) => {
    if (brand === "Skoda") {
      setError(null);
      setStep(2);
    } else {
      const msg = WRONG_CAR_MESSAGES[msgIndex % WRONG_CAR_MESSAGES.length];
      setMsgIndex((i) => i + 1);
      setError(msg);
      triggerShake();
    }
  };

  const handleF1Click = (driver: string) => {
    if (driver === "Max Verstappen") {
      setError(null);
      setStep("supermax");
      // Try to speak TUTUDUDU
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          "TUDU TUDU TUDU TUDU TU. MAX VERSTAPPEN! SUPER MAX MAX MAX SUPER SUPER MAX MAX MAX!"
        );
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      }
      // Move to step 3 after celebration
      setTimeout(() => {
        setStep(3);
      }, 3500);
    } else {
      const msg = WRONG_F1_MESSAGES[msgIndex % WRONG_F1_MESSAGES.length];
      setMsgIndex((i) => i + 1);
      setError(msg);
      triggerShake();
    }
  };

  const handleCountryClick = () => {
    // Every option is France — they're all correct!
    setError(null);
    setStep("celebrating");
    setFlagRain(true);
    setTimeout(() => {
      setCookie(COOKIE_NAME, "true", COOKIE_MAX_AGE);
      setAuthed(true);
    }, 2500);
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
            ${step === "supermax" ? "!bg-orange-500 !border-orange-600" : ""}
          `}
        >
          {/* Step 1: Car Logos */}
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
                        src={brand.logo}
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

          {/* Step 2: F1 Drivers */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-2xl">🏎️</p>
                <h2 className="text-xl sm:text-2xl font-bold">
                  Nice! Next one...
                </h2>
                <p className="text-muted-foreground text-sm">
                  Who is Gio&apos;s favourite F1 driver?
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {F1_DRIVERS.map((driver) => (
                  <button
                    key={driver.name}
                    onClick={() => handleF1Click(driver.name)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-background hover:bg-accent hover:border-foreground/20 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground group-hover:text-foreground">
                      {driver.number}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground text-center leading-tight">
                      {driver.name}
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

          {/* Super Max Celebration */}
          {step === "supermax" && (
            <div className="text-center space-y-4 py-6 animate-supermax-pulse">
              <div className="text-6xl animate-bounce">🦁</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
                SUPER MAX MAX MAX
              </h2>
              <p className="text-lg text-orange-100 font-bold">
                🟠 TUTUDUDU TUTUDUDU 🟠
              </p>
              <div className="flex justify-center gap-2 text-3xl">
                <span className="animate-bounce" style={{ animationDelay: "0s" }}>🦁</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>🏆</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>🇳🇱</span>
                <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>🏎️</span>
                <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>🦁</span>
              </div>
              <p className="text-white/80 text-sm font-medium">
                MAX VERSTAPPEN VERSTAPPEN!
              </p>
            </div>
          )}

          {/* Step 3: Country (all France) */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-2xl">🌍</p>
                <h2 className="text-xl sm:text-2xl font-bold">
                  Last one...
                </h2>
                <p className="text-muted-foreground text-sm">
                  If one country could disappear tomorrow, which one would it be?
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.name}
                    onClick={() => handleCountryClick()}
                    className="flex items-center gap-2 p-3 rounded-xl border bg-background hover:bg-accent hover:border-foreground/20 transition-all cursor-pointer"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-sm font-medium">{country.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Final celebration */}
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

        {/* Orange confetti for Super Max */}
        {step === "supermax" && (
          <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-2xl sm:text-3xl animate-flag-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${1.5 + Math.random() * 2}s`,
                }}
              >
                {["🦁", "🟠", "🇳🇱", "🏆", "🏎️"][i % 5]}
              </span>
            ))}
          </div>
        )}

        {/* Flag rain for final celebration */}
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
