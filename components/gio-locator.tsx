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

const RINGS = [0.25, 0.5, 0.75, 1];

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
    const normalizedDist = Math.min(distance / maxRange, 0.92);
    const rPct = normalizedDist * 50;
    const rad = ((angle - 90) * Math.PI) / 180;
    const xPct = Math.cos(rad) * rPct;
    const yPct = Math.sin(rad) * rPct;
    return { left: `calc(50% + ${xPct}%)`, top: `calc(50% + ${yPct}%)` };
  }, [visitor, gioCoords, distance, maxRange]);

  return (
    <div className="max-w-lg mx-auto">
      <MagicCard
        gradientColor={gioCountryInfo.color + "15"}
        gradientFrom={gioCountryInfo.color}
        gradientTo={gioCountryInfo.color + "80"}
        gradientOpacity={0.4}
        className="p-5 sm:p-8"
      >
        {/* Radar */}
        <div
          className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] mx-auto rounded-full border border-border/50 overflow-hidden"
          style={{
            background: "radial-gradient(circle, hsl(var(--muted) / 0.3) 0%, transparent 70%)",
          }}
        >
          {/* Range rings */}
          {RINGS.map((r, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/30"
              style={{ width: `${r * 100}%`, height: `${r * 100}%` }}
            />
          ))}

          {/* Crosshairs */}
          <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-transparent via-border/30 to-transparent" />
          <div className="absolute top-1/2 left-0 h-px w-full bg-gradient-to-r from-transparent via-border/30 to-transparent" />

          {/* Sweep */}
          <div className="absolute inset-0 rounded-full radar-sweep" />

          {/* Range labels */}
          {RINGS.map((r, i) => (
            <div
              key={`lbl-${i}`}
              className="absolute left-1/2 text-[7px] sm:text-[8px] text-muted-foreground/30 whitespace-nowrap font-mono"
              style={{ top: `${50 - r * 50}%`, transform: "translate(6px, -3px)" }}
            >
              {Math.round(maxRange * r).toLocaleString()} km
            </div>
          ))}

          {/* Center — You (visitor) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center">
            <div className="relative">
              <span className="absolute inset-0 animate-ping rounded-full bg-foreground/20" />
              <div className="relative w-3 h-3 rounded-full bg-foreground mx-auto shadow-sm" />
            </div>
            <div className="text-[9px] sm:text-[10px] font-semibold text-foreground mt-1.5 tracking-wider uppercase">
              You
            </div>
            {visitor && (
              <div className="text-[7px] sm:text-[8px] text-muted-foreground/60 mt-0.5">
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
                <div
                  className="w-3 h-3 rounded-full radar-blip"
                  style={{
                    background: gioCountryInfo.color,
                    boxShadow: `0 0 8px 3px ${gioCountryInfo.color}66`,
                  }}
                />
                <div className="absolute top-4 text-center whitespace-nowrap">
                  <div className="text-[9px] sm:text-[10px] font-medium text-foreground/90">
                    {gioCountryInfo.flag} Gio
                  </div>
                  <div className="text-[7px] sm:text-[8px] text-muted-foreground/60">
                    {gioCity}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!geoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-40">
              <div className="text-xs text-muted-foreground animate-pulse">Locating...</div>
            </div>
          )}
        </div>

        {/* Distance readout */}
        <div className="text-center mt-6">
          {distance ? (
            <>
              <div className="text-xs text-muted-foreground mb-1">
                Distance to Gio
              </div>
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                <NumberTicker value={Math.round(distance)} delay={0.2} /> km
              </div>
              <div className="text-xs text-muted-foreground/60 mt-1.5">
                {visitor?.city ?? "You"} → {gioCity}, {gioCountryInfo.name}
              </div>
            </>
          ) : geoLoaded ? (
            <div className="text-sm text-muted-foreground">
              Gio is currently in {gioCountryInfo.flag} {gioCity}, {gioCountryInfo.name}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground animate-pulse">
              Detecting your location...
            </div>
          )}
        </div>
      </MagicCard>
    </div>
  );
}
