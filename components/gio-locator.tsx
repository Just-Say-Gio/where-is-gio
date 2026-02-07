"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { getCityCoords } from "@/lib/city-coords";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

/* ---- Math ---- */

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function bearingToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/* ---- IP Geolocation ---- */

interface VisitorGeo {
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode: string;
}

async function fetchVisitorLocation(): Promise<VisitorGeo | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.latitude || !data.longitude) return null;
    return {
      lat: data.latitude,
      lng: data.longitude,
      city: data.city || "Unknown",
      country: data.country_name || "Unknown",
      countryCode: data.country_code || "",
    };
  } catch {
    return null;
  }
}

/* ---- Sweep helpers ---- */

const SWEEP_DURATION = 5000;
const SWEEP_SPEED = 360 / SWEEP_DURATION;

function sweepDelta(sweepAngle: number, targetBearing: number): number {
  return ((sweepAngle - targetBearing) % 360 + 360) % 360;
}

function blipIntensity(delta: number): number {
  if (delta < 20) return 1;
  if (delta < 150) return 1 - (delta - 20) / 130;
  return 0;
}

/* ---- Constants ---- */

const RINGS = [0.2, 0.4, 0.6, 0.8, 1];
const COMPASS = [
  { label: "N", angle: 0 },
  { label: "E", angle: 90 },
  { label: "S", angle: 180 },
  { label: "W", angle: 270 },
];
const TICK_COUNT = 72;
const HUD = "#a855f7"; // purple-500

/* ---- Inline styles (constant objects to avoid re-creation) ---- */

const scanlineStyle: React.CSSProperties = {
  background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)",
  backgroundSize: "100% 2px",
};

const noiseStyle: React.CSSProperties = {
  opacity: 0.035,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  backgroundRepeat: "repeat",
};

const vignetteStyle: React.CSSProperties = {
  background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.85) 100%)",
};

const radarBgStyle: React.CSSProperties = {
  background: "radial-gradient(circle, #1a0d2e 0%, #0d0820 60%, #06030f 100%)",
  boxShadow: `inset 0 0 30px rgba(168,85,247,0.05), 0 0 1px rgba(168,85,247,0.3), 0 0 4px rgba(168,85,247,0.15), 0 0 15px rgba(168,85,247,0.08), 0 0 40px rgba(168,85,247,0.04)`,
  border: "1px solid rgba(168,85,247,0.2)",
};

const sectionBgStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, transparent 0%, #0a0814 8%, #0a0814 92%, transparent 100%)",
};

const glowTextStyle: React.CSSProperties = {
  textShadow: "0 0 4px rgba(168,85,247,0.6), 0 0 8px rgba(168,85,247,0.3), 0 0 16px rgba(168,85,247,0.15)",
};

/* ---- Component ---- */

interface GioLocatorProps {
  currentSegment: TravelSegment | null;
}

export function GioLocator({ currentSegment }: GioLocatorProps) {
  const [visitor, setVisitor] = useState<VisitorGeo | null>(null);
  const [geoLoaded, setGeoLoaded] = useState(false);

  // rAF-driven sweep angle
  const [sweepAngle, setSweepAngle] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Ping rings
  const [pingRings, setPingRings] = useState<Array<{ id: number; x: string; y: string }>>([]);
  const lastPingRef = useRef<number>(0);

  const animateSweep = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    setSweepAngle((elapsed * SWEEP_SPEED) % 360);
    rafRef.current = requestAnimationFrame(animateSweep);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateSweep);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animateSweep]);

  // Gio's data
  const gioCoords = useMemo(() => {
    if (!currentSegment) return getCityCoords("Hua Hin", "TH")!;
    return getCityCoords(currentSegment.city, currentSegment.countryCode) ?? getCityCoords("Hua Hin", "TH")!;
  }, [currentSegment]);

  const gioCity = currentSegment?.city ?? "Hua Hin";
  const gioCountryCode = currentSegment?.countryCode ?? "TH";
  const gioCountryInfo = getCountryInfo(gioCountryCode);

  // Fetch visitor location
  useEffect(() => {
    fetchVisitorLocation().then((geo) => {
      if (geo) setVisitor(geo);
      setGeoLoaded(true);
    });
  }, []);

  // Distance + bearing
  const distance = useMemo(() => {
    if (!visitor || !gioCoords) return null;
    return haversineKm(visitor.lat, visitor.lng, gioCoords[0], gioCoords[1]);
  }, [gioCoords, visitor]);

  const gioBearing = useMemo(() => {
    if (!visitor || !gioCoords) return 0;
    return bearingDeg(visitor.lat, visitor.lng, gioCoords[0], gioCoords[1]);
  }, [visitor, gioCoords]);

  const maxRange = useMemo(() => {
    if (!distance) return 10000;
    return Math.max(distance * 1.3, 500);
  }, [distance]);

  // Gio's blip position
  const gioBlipStyle = useMemo(() => {
    if (!visitor || !distance) return null;
    const normalizedDist = Math.min(distance / maxRange, 0.88);
    const rPct = normalizedDist * 50;
    const rad = ((gioBearing - 90) * Math.PI) / 180;
    const xPct = Math.cos(rad) * rPct;
    const yPct = Math.sin(rad) * rPct;
    return { left: `calc(50% + ${xPct}%)`, top: `calc(50% + ${yPct}%)` };
  }, [visitor, distance, maxRange, gioBearing]);

  // Sweep-reactive intensity
  const delta = sweepDelta(sweepAngle, gioBearing);
  const intensity = gioBlipStyle ? blipIntensity(delta) : 0;
  const blipOpacity = 0.25 + intensity * 0.75;
  const glowSize = intensity * 20;
  const glowOpacity = intensity * 0.6;
  const lineOpacity = 0.08 + intensity * 0.25;

  const accentColor = gioCountryInfo.color;

  // Trigger ping rings when sweep passes blip
  useEffect(() => {
    if (intensity > 0.9 && gioBlipStyle && Date.now() - lastPingRef.current > 4500) {
      lastPingRef.current = Date.now();
      const newPing = { id: Date.now(), x: gioBlipStyle.left, y: gioBlipStyle.top };
      setPingRings((prev) => [...prev.slice(-2), newPing]);
      // Clean up after animation completes
      const pingId = newPing.id;
      setTimeout(() => {
        setPingRings((prev) => prev.filter((p) => p.id !== pingId));
      }, 3000);
    }
  }, [intensity, gioBlipStyle]);

  // Computed HUD data
  const cardinal = useMemo(() => bearingToCardinal(gioBearing), [gioBearing]);

  return (
    <section
      className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 lg:py-14"
      style={sectionBgStyle}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section title */}
        <div className="text-center mb-6 space-y-2">
          <h2>
            <AnimatedGradientText
              colorFrom="#a855f7"
              colorTo="#6366f1"
              speed={3}
              className="text-sm font-semibold tracking-widest uppercase"
            >
              Gio Locator
            </AnimatedGradientText>
          </h2>
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border border-[#a855f7]/15 bg-[#a855f7]/5 px-2.5 py-0.5">
              <AnimatedShinyText className="text-[10px] font-medium text-[#a855f7]/70">
                📡 Live Tracking
              </AnimatedShinyText>
            </div>
          </div>
        </div>

        {/* Outer HUD container */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "#0a0618", border: "1px solid rgba(168,85,247,0.1)" }}>
          <BorderBeam
            size={300}
            duration={6}
            colorFrom={HUD}
            colorTo={accentColor}
            borderWidth={1.5}
          />

          {/* CRT scanlines over entire container */}
          <div
            className="absolute inset-0 pointer-events-none z-[60] rounded-2xl"
            style={{ ...scanlineStyle, opacity: 0.15 }}
          />

          <div className="p-4 sm:p-6 lg:p-8">
            {/* ---- Top HUD Panels ---- */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {/* Panel: Bearing */}
              <div className="hud-panel bg-[#120a24]/80 border border-[#a855f7]/15 p-2.5 sm:p-3">
                <div className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: `${HUD}60` }}>
                  BRG
                </div>
                <div className="font-mono text-sm sm:text-lg font-bold mt-0.5" style={{ color: HUD, ...glowTextStyle }}>
                  {distance ? (
                    <>
                      {Math.round(gioBearing)}° <span className="text-[10px] sm:text-xs opacity-70">{cardinal}</span>
                    </>
                  ) : (
                    <span className="opacity-30">---</span>
                  )}
                </div>
              </div>

              {/* Panel: Target Coords */}
              <div className="hud-panel bg-[#120a24]/80 border border-[#a855f7]/15 p-2.5 sm:p-3">
                <div className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: `${HUD}60` }}>
                  TGT
                </div>
                <div className="font-mono text-[10px] sm:text-xs font-semibold mt-0.5 leading-relaxed" style={{ color: HUD, ...glowTextStyle }}>
                  {gioCoords ? (
                    <>
                      {gioCoords[0].toFixed(2)}°{gioCoords[0] >= 0 ? "N" : "S"}
                      {" "}
                      {Math.abs(gioCoords[1]).toFixed(2)}°{gioCoords[1] >= 0 ? "E" : "W"}
                    </>
                  ) : "---"}
                </div>
              </div>

              {/* Panel: Range */}
              <div className="hud-panel bg-[#120a24]/80 border border-[#a855f7]/15 p-2.5 sm:p-3">
                <div className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: `${HUD}60` }}>
                  RNG
                </div>
                <div className="font-mono text-sm sm:text-lg font-bold mt-0.5" style={{ color: HUD, ...glowTextStyle }}>
                  {distance ? (
                    <>{Math.round(maxRange).toLocaleString()} <span className="text-[10px] sm:text-xs opacity-70">km</span></>
                  ) : (
                    <span className="opacity-30">---</span>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Radar Circle ---- */}
            <div className="relative mx-auto w-[300px] h-[300px] sm:w-[460px] sm:h-[460px] lg:w-[560px] lg:h-[560px]">
              {/* Outer glow ring */}
              <div
                className="absolute -inset-4 rounded-full opacity-30 blur-2xl"
                style={{ background: `radial-gradient(circle, ${HUD}15 0%, transparent 70%)` }}
              />

              {/* Main radar circle */}
              <div className="absolute inset-0 rounded-full overflow-hidden" style={radarBgStyle}>
                {/* Animated grid background */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, rgba(168,85,247,0.04) 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(168,85,247,0.04) 0px, transparent 1px, transparent 40px)`,
                  }}
                />

                {/* Range rings */}
                {RINGS.map((r, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${r * 100}%`,
                      height: `${r * 100}%`,
                      border: "1px solid",
                      borderColor: i === RINGS.length - 1
                        ? `rgba(168,85,247,0.25)`
                        : `rgba(168,85,247,${0.06 + i * 0.03})`,
                    }}
                  />
                ))}

                {/* Crosshairs — primary */}
                <div
                  className="absolute left-1/2 top-0 w-px h-full"
                  style={{
                    background: `linear-gradient(to bottom, transparent 5%, rgba(168,85,247,0.12) 30%, rgba(168,85,247,0.2) 50%, rgba(168,85,247,0.12) 70%, transparent 95%)`,
                  }}
                />
                <div
                  className="absolute top-1/2 left-0 h-px w-full"
                  style={{
                    background: `linear-gradient(to right, transparent 5%, rgba(168,85,247,0.12) 30%, rgba(168,85,247,0.2) 50%, rgba(168,85,247,0.12) 70%, transparent 95%)`,
                  }}
                />

                {/* Diagonal crosshairs */}
                <div
                  className="absolute left-1/2 top-1/2 w-px h-full origin-center -translate-x-1/2 -translate-y-1/2 rotate-45"
                  style={{
                    background: `linear-gradient(to bottom, transparent 10%, rgba(168,85,247,0.06) 40%, rgba(168,85,247,0.06) 60%, transparent 90%)`,
                  }}
                />
                <div
                  className="absolute left-1/2 top-1/2 w-px h-full origin-center -translate-x-1/2 -translate-y-1/2 -rotate-45"
                  style={{
                    background: `linear-gradient(to bottom, transparent 10%, rgba(168,85,247,0.06) 40%, rgba(168,85,247,0.06) 60%, transparent 90%)`,
                  }}
                />

                {/* Tick marks */}
                {Array.from({ length: TICK_COUNT }).map((_, i) => {
                  const angle = (i * 360) / TICK_COUNT;
                  const isMajor = angle % 90 === 0;
                  const isMinor = angle % 30 === 0;
                  if (isMajor) return null;
                  return (
                    <div
                      key={`tick-${i}`}
                      className="absolute left-1/2 top-0 origin-bottom"
                      style={{
                        height: "50%",
                        width: "1px",
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: "50% 100%",
                        top: "0",
                        left: "calc(50% - 0.5px)",
                      }}
                    >
                      <div
                        className="w-px"
                        style={{
                          height: isMinor ? "4%" : "2%",
                          background: isMinor ? `rgba(168,85,247,0.2)` : `rgba(168,85,247,0.07)`,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Phosphor afterglow trail */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    transform: `rotate(${sweepAngle}deg)`,
                    background: `conic-gradient(from 0deg, transparent 0deg, transparent 270deg, ${HUD}06 310deg, ${HUD}12 345deg, ${HUD}20 355deg, transparent 360deg)`,
                  }}
                />

                {/* Sweep line — sharp leading edge (accent blended) */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    transform: `rotate(${sweepAngle}deg)`,
                    background: `conic-gradient(from 0deg, transparent 0deg, transparent 350deg, ${accentColor}10 355deg, ${HUD}40 358deg, ${HUD}90 360deg)`,
                  }}
                />

                {/* Ping rings (expanding from blip) */}
                {pingRings.map((ring) => (
                  [0, 0.3, 0.6].map((delay, j) => (
                    <div
                      key={`${ring.id}-${j}`}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: ring.x,
                        top: ring.y,
                        transform: "translate(-50%, -50%)",
                        borderStyle: "solid",
                        borderColor: accentColor,
                        animation: `radar-ping 2s ease-out ${delay}s forwards`,
                        width: "12px",
                        height: "12px",
                        opacity: 0,
                      }}
                    />
                  ))
                ))}

                {/* Compass labels */}
                {COMPASS.map(({ label, angle }) => {
                  const rad = ((angle - 90) * Math.PI) / 180;
                  const r = 46;
                  const x = Math.cos(rad) * r;
                  const y = Math.sin(rad) * r;
                  return (
                    <div
                      key={label}
                      className="absolute text-[9px] sm:text-[10px] font-mono font-bold tracking-wider -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${50 + x}%`,
                        top: `${50 + y}%`,
                        color: `rgba(168,85,247,0.5)`,
                        ...glowTextStyle,
                      }}
                    >
                      {label}
                    </div>
                  );
                })}

                {/* Range labels */}
                {RINGS.filter((_, i) => i % 2 === 1).map((r, i) => (
                  <div
                    key={`lbl-${i}`}
                    className="absolute left-1/2 text-[7px] sm:text-[8px] whitespace-nowrap font-mono"
                    style={{
                      top: `${50 - r * 50}%`,
                      transform: "translate(6px, -4px)",
                      color: `rgba(168,85,247,0.2)`,
                    }}
                  >
                    {Math.round(maxRange * r).toLocaleString()} km
                  </div>
                ))}

                {/* Center — You (visitor) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center">
                  <div className="relative">
                    {/* Pulse ring */}
                    <div
                      className="absolute -inset-3 rounded-full animate-ping opacity-15"
                      style={{ backgroundColor: HUD }}
                    />
                    {/* Steady glow */}
                    <div
                      className="absolute -inset-2 rounded-full opacity-25 blur-sm"
                      style={{ backgroundColor: HUD }}
                    />
                    {/* Dot */}
                    <div
                      className="relative w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full mx-auto"
                      style={{
                        backgroundColor: HUD,
                        boxShadow: `0 0 6px ${HUD}, 0 0 12px rgba(168,85,247,0.4)`,
                      }}
                    />
                  </div>
                  <div
                    className="text-[8px] sm:text-[9px] font-bold mt-2 tracking-[0.2em] uppercase font-mono"
                    style={{ color: HUD, ...glowTextStyle }}
                  >
                    You
                  </div>
                  {visitor && (
                    <div className="text-[7px] sm:text-[8px] mt-0.5 font-mono" style={{ color: "rgba(168,85,247,0.35)" }}>
                      {visitor.city}
                    </div>
                  )}
                </div>

                {/* Connection line */}
                {gioBlipStyle && visitor && (
                  <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    <line
                      x1="50%"
                      y1="50%"
                      x2={gioBlipStyle.left}
                      y2={gioBlipStyle.top}
                      stroke={accentColor}
                      strokeOpacity={lineOpacity}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      style={{ transition: "stroke-opacity 0.3s ease" }}
                    />
                  </svg>
                )}

                {/* Gio blip — sweep-reactive */}
                {gioBlipStyle && (
                  <div
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={gioBlipStyle}
                  >
                    <div className="flex flex-col items-center">
                      {/* Sweep-reactive glow ring */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          inset: `-${6 + glowSize * 0.5}px`,
                          background: accentColor,
                          opacity: glowOpacity * 0.3,
                          filter: `blur(${4 + glowSize * 0.4}px)`,
                          transition: "opacity 0.3s ease, inset 0.3s ease, filter 0.3s ease",
                        }}
                      />
                      {/* Outer blur ring */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          inset: `-${10 + glowSize * 0.8}px`,
                          background: accentColor,
                          opacity: glowOpacity * 0.1,
                          filter: `blur(${8 + glowSize * 0.6}px)`,
                          transition: "opacity 0.3s ease, inset 0.3s ease, filter 0.3s ease",
                        }}
                      />
                      {/* Blip dot */}
                      <div
                        className="relative w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full"
                        style={{
                          background: accentColor,
                          opacity: blipOpacity,
                          boxShadow: `0 0 ${4 + glowSize}px ${2 + glowSize * 0.3}px ${accentColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, "0")}`,
                          transition: "opacity 0.3s ease, box-shadow 0.3s ease",
                        }}
                      />
                      {/* Label */}
                      <div
                        className="absolute top-5 sm:top-6 text-center whitespace-nowrap"
                        style={{
                          opacity: 0.5 + intensity * 0.5,
                          transition: "opacity 0.3s ease",
                        }}
                      >
                        <div
                          className="text-[9px] sm:text-[11px] font-bold tracking-wide font-mono"
                          style={{
                            color: accentColor,
                            textShadow: `0 0 4px ${accentColor}80, 0 0 8px ${accentColor}40`,
                          }}
                        >
                          {gioCountryInfo.flag} GIO
                        </div>
                        <div className="text-[7px] sm:text-[8px] font-mono" style={{ color: "rgba(168,85,247,0.35)" }}>
                          {gioCity}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CRT Scanlines overlay (on radar) */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none z-[50]"
                  style={scanlineStyle}
                />

                {/* CRT Noise overlay */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none z-[51] mix-blend-overlay"
                  style={noiseStyle}
                />

                {/* CRT Vignette */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none z-[52]"
                  style={vignetteStyle}
                />

                {/* Loading state */}
                {!geoLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-[55] rounded-full" style={{ background: "rgba(6,3,15,0.85)" }}>
                    <div className="flex flex-col items-start gap-1.5 font-mono text-[9px] sm:text-[10px]" style={{ color: HUD }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: `${HUD}60` }}>&gt;</span>
                        <span>GEOLOCATION MODULE</span>
                        <span className="animate-pulse" style={{ color: `${HUD}80` }}>[PENDING]</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: `${HUD}60` }}>&gt;</span>
                        <span>SATELLITE UPLINK</span>
                        <span className="animate-pulse" style={{ color: `${HUD}80` }}>[SEARCHING]</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: `${HUD}60` }}>&gt;</span>
                        <span>TARGET ACQUISITION</span>
                        <span style={{ color: `${HUD}40` }}>[STANDBY]</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Bottom HUD Bar — Distance Readout ---- */}
            <div className="hud-panel bg-[#120a24]/80 border border-[#a855f7]/15 mt-4 sm:mt-6 p-4 sm:p-5">
              {distance ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.3em] uppercase"
                      style={{ color: `${HUD}60` }}
                    >
                      Distance to Target
                    </div>
                    <div
                      className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm"
                      style={{ color: HUD, background: `${HUD}15`, ...glowTextStyle }}
                    >
                      TGT LOCK
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-4xl sm:text-5xl lg:text-6xl font-bold font-mono tracking-tight"
                      style={{
                        color: accentColor,
                        textShadow: `0 0 8px ${accentColor}60, 0 0 20px ${accentColor}30, 0 0 40px ${accentColor}15`,
                      }}
                    >
                      <NumberTicker value={Math.round(distance)} delay={0.2} />
                    </span>
                    <span
                      className="text-lg sm:text-xl font-mono font-medium"
                      style={{ color: `${HUD}50` }}
                    >
                      km
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] sm:text-xs font-mono">
                    <span style={{ color: `${HUD}50` }}>{visitor?.city ?? "You"}</span>
                    <span style={{ color: accentColor }}>―</span>
                    <span style={{ color: accentColor }}>{gioCountryInfo.flag} {gioCity}, {gioCountryInfo.name}</span>
                  </div>
                </div>
              ) : geoLoaded ? (
                <div className="text-center">
                  <div
                    className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.3em] uppercase mb-2"
                    style={{ color: `${HUD}60` }}
                  >
                    Target Located
                  </div>
                  <div className="text-sm font-mono" style={{ color: HUD, ...glowTextStyle }}>
                    {gioCountryInfo.flag} {gioCity}, {gioCountryInfo.name}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${HUD}40`, borderTopColor: "transparent" }}
                  />
                  <span className="text-[10px] font-mono animate-pulse" style={{ color: `${HUD}60` }}>
                    ACQUIRING SIGNAL...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
