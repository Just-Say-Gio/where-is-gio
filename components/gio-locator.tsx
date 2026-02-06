"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { getCityCoords } from "@/lib/city-coords";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";

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

const SWEEP_DURATION = 5000; // ms per full rotation
const SWEEP_SPEED = 360 / SWEEP_DURATION; // deg per ms

/** Angular difference in the sweep's "just passed" direction (0–360) */
function sweepDelta(sweepAngle: number, targetBearing: number): number {
  return ((sweepAngle - targetBearing) % 360 + 360) % 360;
}

/** Map sweep delta to blip intensity: 1 at 0°, fading to 0 at ~150° */
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
  const gioCountryInfo = currentSegment
    ? getCountryInfo(currentSegment.countryCode)
    : getCountryInfo("TH");

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

  // Max range for radar
  const maxRange = useMemo(() => {
    if (!distance) return 10000;
    return Math.max(distance * 1.3, 500);
  }, [distance]);

  // Gio's blip position (relative to visitor at center)
  const gioBlipStyle = useMemo(() => {
    if (!visitor || !distance) return null;
    const normalizedDist = Math.min(distance / maxRange, 0.88);
    const rPct = normalizedDist * 50;
    const rad = ((gioBearing - 90) * Math.PI) / 180;
    const xPct = Math.cos(rad) * rPct;
    const yPct = Math.sin(rad) * rPct;
    return { left: `calc(50% + ${xPct}%)`, top: `calc(50% + ${yPct}%)` };
  }, [visitor, distance, maxRange, gioBearing]);

  // Sweep-reactive intensity for Gio blip
  const delta = sweepDelta(sweepAngle, gioBearing);
  const intensity = gioBlipStyle ? blipIntensity(delta) : 0;
  const blipOpacity = 0.25 + intensity * 0.75; // 0.25 baseline, 1.0 when just swept
  const glowSize = intensity * 20; // 0–20px
  const glowOpacity = intensity * 0.6; // 0–0.6
  const lineOpacity = 0.08 + intensity * 0.25; // 0.08 baseline, 0.33 peak

  const accentColor = gioCountryInfo.color;

  return (
    <div className="max-w-2xl mx-auto">
      <MagicCard
        gradientColor={accentColor + "12"}
        gradientFrom={accentColor}
        gradientTo={accentColor + "60"}
        gradientOpacity={0.35}
        className="p-4 sm:p-6 lg:p-8"
      >
        {/* Radar container */}
        <div className="relative mx-auto w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[480px] lg:h-[480px]">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full opacity-40 blur-xl"
            style={{ background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)` }}
          />

          {/* Main radar circle */}
          <div
            className="absolute inset-0 rounded-full border border-border/40 overflow-hidden"
            style={{
              background: "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.15) 0%, hsl(var(--muted) / 0.05) 50%, transparent 80%)",
            }}
          >
            {/* Range rings with varying opacity */}
            {RINGS.map((r, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: `${r * 100}%`,
                  height: `${r * 100}%`,
                  border: `1px solid`,
                  borderColor: i === RINGS.length - 1
                    ? `color-mix(in oklch, ${accentColor} 20%, hsl(var(--border)) 80%)`
                    : `hsl(var(--border) / ${0.15 + i * 0.05})`,
                }}
              />
            ))}

            {/* Crosshairs — primary */}
            <div
              className="absolute left-1/2 top-0 w-px h-full"
              style={{
                background: `linear-gradient(to bottom, transparent 5%, hsl(var(--border) / 0.25) 30%, ${accentColor}15 50%, hsl(var(--border) / 0.25) 70%, transparent 95%)`,
              }}
            />
            <div
              className="absolute top-1/2 left-0 h-px w-full"
              style={{
                background: `linear-gradient(to right, transparent 5%, hsl(var(--border) / 0.25) 30%, ${accentColor}15 50%, hsl(var(--border) / 0.25) 70%, transparent 95%)`,
              }}
            />

            {/* Diagonal crosshairs (45deg) */}
            <div
              className="absolute left-1/2 top-1/2 w-px h-full origin-center -translate-x-1/2 -translate-y-1/2 rotate-45"
              style={{
                background: `linear-gradient(to bottom, transparent 10%, hsl(var(--border) / 0.1) 40%, hsl(var(--border) / 0.1) 60%, transparent 90%)`,
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 w-px h-full origin-center -translate-x-1/2 -translate-y-1/2 -rotate-45"
              style={{
                background: `linear-gradient(to bottom, transparent 10%, hsl(var(--border) / 0.1) 40%, hsl(var(--border) / 0.1) 60%, transparent 90%)`,
              }}
            />

            {/* Tick marks around edge */}
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
                      background: isMinor
                        ? `hsl(var(--muted-foreground) / 0.2)`
                        : `hsl(var(--muted-foreground) / 0.08)`,
                    }}
                  />
                </div>
              );
            })}

            {/* Phosphor afterglow trail — wider, dimmer wedge behind sweep */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                transform: `rotate(${sweepAngle}deg)`,
                background: `conic-gradient(from 0deg, transparent 0deg, transparent 270deg, ${accentColor}04 310deg, ${accentColor}10 345deg, ${accentColor}18 355deg, transparent 360deg)`,
              }}
            />

            {/* Sweep line — sharp leading edge */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                transform: `rotate(${sweepAngle}deg)`,
                background: `conic-gradient(from 0deg, transparent 0deg, transparent 350deg, ${accentColor}10 355deg, ${accentColor}40 358deg, ${accentColor}80 360deg)`,
              }}
            />

            {/* Compass labels */}
            {COMPASS.map(({ label, angle }) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const r = 46;
              const x = Math.cos(rad) * r;
              const y = Math.sin(rad) * r;
              return (
                <div
                  key={label}
                  className="absolute text-[9px] sm:text-[10px] font-mono font-semibold tracking-wider -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${50 + x}%`,
                    top: `${50 + y}%`,
                    color: `color-mix(in oklch, ${accentColor} 40%, hsl(var(--muted-foreground)))`,
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
                className="absolute left-1/2 text-[7px] sm:text-[8px] text-muted-foreground/25 whitespace-nowrap font-mono"
                style={{ top: `${50 - r * 50}%`, transform: "translate(6px, -4px)" }}
              >
                {Math.round(maxRange * r).toLocaleString()} km
              </div>
            ))}

            {/* Center — You (visitor) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center">
              <div className="relative">
                <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-foreground mx-auto shadow-sm ring-2 ring-background" />
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-foreground mt-2 tracking-widest uppercase">
                You
              </div>
              {visitor && (
                <div className="text-[7px] sm:text-[8px] text-muted-foreground/50 mt-0.5 font-mono">
                  {visitor.city}
                </div>
              )}
            </div>

            {/* Connection line between visitor and Gio — sweep-reactive */}
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
                  {/* Blip dot */}
                  <div
                    className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ring-2 ring-background"
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
                      className="text-[9px] sm:text-[11px] font-bold tracking-wide"
                      style={{ color: accentColor }}
                    >
                      {gioCountryInfo.flag} Gio
                    </div>
                    <div className="text-[7px] sm:text-[8px] text-muted-foreground/50 font-mono">
                      {gioCity}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {!geoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-40 rounded-full backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: `${accentColor}40`, borderTopColor: "transparent" }}
                  />
                  <div className="text-[10px] text-muted-foreground font-mono tracking-wider">
                    LOCATING...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Distance readout */}
        <div className="text-center mt-6 sm:mt-8">
          {distance ? (
            <>
              <div className="text-[10px] sm:text-xs text-muted-foreground/60 mb-1 font-mono tracking-widest uppercase">
                Distance to Gio
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                <NumberTicker value={Math.round(distance)} delay={0.2} />
                <span className="text-lg sm:text-xl lg:text-2xl font-medium text-muted-foreground ml-1.5">km</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground/50">
                <span className="font-mono">{visitor?.city ?? "You"}</span>
                <span style={{ color: accentColor }}>―――</span>
                <span className="font-mono">{gioCity}, {gioCountryInfo.name}</span>
              </div>
            </>
          ) : geoLoaded ? (
            <div className="text-sm text-muted-foreground">
              Gio is currently in {gioCountryInfo.flag} {gioCity}, {gioCountryInfo.name}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground animate-pulse font-mono">
              Detecting your location...
            </div>
          )}
        </div>
      </MagicCard>
    </div>
  );
}
