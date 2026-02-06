"use client";

import { useState, useEffect, useMemo } from "react";
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

/* ---- Constants ---- */

const RINGS = [0.2, 0.4, 0.6, 0.8, 1];
const COMPASS = [
  { label: "N", angle: 0 },
  { label: "E", angle: 90 },
  { label: "S", angle: 180 },
  { label: "W", angle: 270 },
];
const TICK_COUNT = 72; // small tick marks every 5 degrees

/* ---- Component ---- */

interface GioLocatorProps {
  currentSegment: TravelSegment | null;
}

export function GioLocator({ currentSegment }: GioLocatorProps) {
  const [visitor, setVisitor] = useState<VisitorGeo | null>(null);
  const [geoLoaded, setGeoLoaded] = useState(false);

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

  // Distance
  const distance = useMemo(() => {
    if (!visitor || !gioCoords) return null;
    return haversineKm(visitor.lat, visitor.lng, gioCoords[0], gioCoords[1]);
  }, [gioCoords, visitor]);

  // Max range for radar
  const maxRange = useMemo(() => {
    if (!distance) return 10000;
    return Math.max(distance * 1.3, 500);
  }, [distance]);

  // Gio's blip position (relative to visitor at center)
  const gioBlipStyle = useMemo(() => {
    if (!visitor || !distance) return null;
    const angle = bearingDeg(visitor.lat, visitor.lng, gioCoords[0], gioCoords[1]);
    const normalizedDist = Math.min(distance / maxRange, 0.88);
    const rPct = normalizedDist * 50;
    const rad = ((angle - 90) * Math.PI) / 180;
    const xPct = Math.cos(rad) * rPct;
    const yPct = Math.sin(rad) * rPct;
    return { left: `calc(50% + ${xPct}%)`, top: `calc(50% + ${yPct}%)` };
  }, [visitor, gioCoords, distance, maxRange]);

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
              if (isMajor) return null; // compass labels handle these
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

            {/* Sweep — uses country accent color */}
            <div
              className="absolute inset-0 rounded-full radar-sweep"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, transparent 340deg, ${accentColor}08 350deg, ${accentColor}30 358deg, ${accentColor}60 360deg)`,
              }}
            />

            {/* Compass labels */}
            {COMPASS.map(({ label, angle }) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const r = 46; // percent from center
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
                <span
                  className="absolute -inset-2 animate-ping rounded-full opacity-20"
                  style={{ background: accentColor }}
                />
                <span
                  className="absolute -inset-1 rounded-full opacity-10 animate-pulse"
                  style={{ background: accentColor }}
                />
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

            {/* Gio blip */}
            {gioBlipStyle && (
              <div
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={gioBlipStyle}
              >
                <div className="flex flex-col items-center">
                  {/* Outer pulse ring */}
                  <div
                    className="absolute -inset-3 rounded-full animate-ping opacity-15"
                    style={{ background: accentColor }}
                  />
                  {/* Mid glow */}
                  <div
                    className="absolute -inset-2 rounded-full animate-pulse opacity-20"
                    style={{ background: accentColor }}
                  />
                  {/* Blip dot */}
                  <div
                    className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full radar-blip ring-2 ring-background"
                    style={{
                      background: accentColor,
                      boxShadow: `0 0 12px 4px ${accentColor}50, 0 0 24px 8px ${accentColor}20`,
                    }}
                  />
                  {/* Label */}
                  <div className="absolute top-5 sm:top-6 text-center whitespace-nowrap">
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

            {/* Connection line between visitor and Gio */}
            {gioBlipStyle && visitor && (
              <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                <line
                  x1="50%"
                  y1="50%"
                  x2={gioBlipStyle.left}
                  y2={gioBlipStyle.top}
                  stroke={accentColor}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </svg>
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
