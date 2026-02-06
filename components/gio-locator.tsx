"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, useInView } from "motion/react";
import { TravelSegment } from "@/lib/types";
import { getCountryInfo } from "@/lib/countries";
import { getCityCoords } from "@/lib/city-coords";

/* ---- Math utilities (from original GioLocator.jsx) ---- */

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

function bearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
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

const RADAR_GREEN = "#00ff88";
const RINGS = [0.25, 0.5, 0.75, 1];

/* ---- Terminal Init Sequence ---- */

function TerminalInit({
  lines,
  onComplete,
}: {
  lines: string[];
  onComplete: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const completeCalled = useRef(false);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= lines.length) {
        clearInterval(interval);
        // Small delay before showing radar
        setTimeout(() => {
          if (!completeCalled.current) {
            completeCalled.current = true;
            onComplete();
          }
        }, 600);
      }
    }, 350);
    return () => clearInterval(interval);
  }, [inView, lines.length, onComplete]);

  return (
    <div
      ref={ref}
      className="font-mono text-[10px] sm:text-xs leading-relaxed space-y-1 mb-6"
    >
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={
            i < visibleCount
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: -8 }
          }
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5"
        >
          <span className="text-[#00ff88]/50 select-none">&gt;</span>
          <span
            className={
              line.startsWith("SYSTEM READY")
                ? "text-[#00ff88]"
                : line.startsWith("⚠")
                  ? "text-amber-400"
                  : "text-[#00ff88]/80"
            }
          >
            {line}
          </span>
          {i === visibleCount - 1 && (
            <span className="inline-block w-1.5 h-3.5 bg-[#00ff88] animate-pulse" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ---- Radar Visualization ---- */

function Radar({
  gioCoords,
  gioLabel,
  visitor,
  distance,
  maxRange,
}: {
  gioCoords: [number, number];
  gioLabel: string;
  visitor: VisitorGeo | null;
  distance: number | null;
  maxRange: number;
}) {
  // Blip position
  const blipStyle = useMemo(() => {
    if (!visitor || !distance) return null;
    const angle = bearingDeg(
      gioCoords[0],
      gioCoords[1],
      visitor.lat,
      visitor.lng
    );
    const normalizedDist = Math.min(distance / maxRange, 0.92);
    // r as percentage of half the container
    const rPct = normalizedDist * 50; // 50% = edge of circle
    const rad = ((angle - 90) * Math.PI) / 180;
    const xPct = Math.cos(rad) * rPct;
    const yPct = Math.sin(rad) * rPct;
    return {
      left: `calc(50% + ${xPct}%)`,
      top: `calc(50% + ${yPct}%)`,
    };
  }, [gioCoords, visitor, distance, maxRange]);

  return (
    <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] mx-auto rounded-full border border-[#00ff88]/20 overflow-hidden"
      style={{
        background: "radial-gradient(circle, rgba(0,255,136,0.03) 0%, transparent 70%)",
        boxShadow: "0 0 60px rgba(0,255,136,0.06), inset 0 0 60px rgba(0,255,136,0.02)",
      }}
    >
      {/* Range rings */}
      {RINGS.map((r, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00ff88]/10"
          style={{ width: `${r * 100}%`, height: `${r * 100}%` }}
        />
      ))}

      {/* Crosshairs */}
      <div
        className="absolute left-1/2 top-0 w-px h-full"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(0,255,136,0.06), transparent)" }}
      />
      <div
        className="absolute top-1/2 left-0 h-px w-full"
        style={{ background: "linear-gradient(to right, transparent, rgba(0,255,136,0.06), transparent)" }}
      />

      {/* Sweep */}
      <div className="absolute inset-0 rounded-full radar-sweep" />

      {/* Sweep trail */}
      <div
        className="absolute inset-0 rounded-full radar-sweep"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(0,255,136,0.03) 330deg, rgba(0,255,136,0.015) 360deg)",
        }}
      />

      {/* Range labels */}
      {RINGS.map((r, i) => (
        <div
          key={`lbl-${i}`}
          className="absolute left-1/2 font-mono text-[7px] sm:text-[8px] text-[#00ff88]/30 whitespace-nowrap"
          style={{
            top: `${50 - r * 50}%`,
            transform: "translate(6px, -3px)",
          }}
        >
          {Math.round(maxRange * r).toLocaleString()} km
        </div>
      ))}

      {/* Center — Gio */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center">
        <div
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-white mx-auto"
          style={{
            boxShadow: "0 0 12px 4px rgba(255,255,255,0.4), 0 0 24px 8px rgba(0,255,136,0.3)",
          }}
        />
        <div className="font-mono text-[9px] sm:text-[10px] font-semibold text-white mt-1 tracking-[2px]"
          style={{ textShadow: "0 0 8px rgba(255,255,255,0.5)" }}
        >
          GIO
        </div>
        <div className="font-mono text-[7px] sm:text-[8px] text-[#00ff88]/60 mt-0.5">
          {gioLabel}
        </div>
      </div>

      {/* Visitor blip */}
      {visitor && blipStyle && (
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={blipStyle}
        >
          <div className="flex flex-col items-center">
            <div
              className="w-2.5 h-2.5 rounded-full radar-blip"
              style={{
                background: RADAR_GREEN,
                boxShadow: `0 0 8px 3px rgba(0,255,136,0.4)`,
              }}
            />
            <div className="absolute top-4 font-mono text-center whitespace-nowrap">
              <div className="text-[8px] sm:text-[9px] text-[#00ff88]/90"
                style={{ textShadow: "0 0 6px rgba(0,255,136,0.5)" }}
              >
                {visitor.city}
              </div>
              <div className="text-[7px] sm:text-[8px] text-[#00ff88]/50">
                {distance ? `${Math.round(distance).toLocaleString()} km` : ""}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Main GioLocator Component ---- */

interface GioLocatorProps {
  currentSegment: TravelSegment | null;
}

export function GioLocator({ currentSegment }: GioLocatorProps) {
  const [visitor, setVisitor] = useState<VisitorGeo | null>(null);
  const [geoLoaded, setGeoLoaded] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [showRadar, setShowRadar] = useState(false);

  // Gio's coords
  const gioCoords = useMemo(() => {
    if (!currentSegment) return getCityCoords("Hua Hin", "TH")!;
    return (
      getCityCoords(currentSegment.city, currentSegment.countryCode) ??
      getCityCoords("Hua Hin", "TH")!
    );
  }, [currentSegment]);

  const gioCity = currentSegment?.city ?? "Hua Hin";
  const gioCountry = currentSegment
    ? getCountryInfo(currentSegment.countryCode).name
    : "Thailand";
  const gioFlag = currentSegment
    ? getCountryInfo(currentSegment.countryCode).flag
    : "\u{1F1F9}\u{1F1ED}";

  // Fetch visitor location
  useEffect(() => {
    fetchVisitorLocation().then((geo) => {
      if (geo) {
        setVisitor(geo);
      } else {
        setGeoError(true);
      }
      setGeoLoaded(true);
    });
  }, []);

  // Compute distance
  const distance = useMemo(() => {
    if (!visitor || !gioCoords) return null;
    return haversineKm(gioCoords[0], gioCoords[1], visitor.lat, visitor.lng);
  }, [gioCoords, visitor]);

  // Max range for radar
  const maxRange = useMemo(() => {
    if (!distance) return 10000;
    return Math.max(distance * 1.3, 500);
  }, [distance]);

  // Build terminal lines (dynamic based on data availability)
  const terminalLines = useMemo(() => {
    const lines = [
      "CNTRLOGIC SYSTEMS — GIOLOCATOR v2.0",
      "SCANNING SATELLITE FEED...",
      `TARGET ACQUIRED: GIO — ${gioCity.toUpperCase()}, ${gioCountry.toUpperCase()} ${gioFlag}`,
    ];

    if (geoLoaded && visitor) {
      const visitorFlag = visitor.countryCode
        ? getCountryInfo(visitor.countryCode).flag
        : "";
      lines.push(
        `VISITOR DETECTED: ${visitor.city.toUpperCase()}, ${visitor.country.toUpperCase()} ${visitorFlag}`
      );
      lines.push(
        `DISTANCE CALCULATED: ${Math.round(distance!).toLocaleString()} KM`
      );
    } else if (geoLoaded && geoError) {
      lines.push("⚠ VISITOR SIGNAL LOST — POSITION UNKNOWN");
    } else {
      lines.push("TRIANGULATING VISITOR POSITION...");
    }

    lines.push("LOADING HISTORICAL FLIGHT DATA...");
    lines.push("SYSTEM READY ✓");
    return lines;
  }, [gioCity, gioCountry, gioFlag, geoLoaded, visitor, geoError, distance]);

  return (
    <div className="max-w-xl mx-auto">
      {/* Section header */}
      <h2 className="text-center text-sm font-semibold text-muted-foreground mb-6 tracking-widest uppercase">
        GioLocator
      </h2>

      {/* Dark container for radar aesthetic */}
      <div className="rounded-xl border border-[#00ff88]/15 bg-[#0a0f0a] p-5 sm:p-8 overflow-hidden"
        style={{
          boxShadow: "0 0 40px rgba(0,255,136,0.04), inset 0 1px 0 rgba(0,255,136,0.05)",
        }}
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#00ff88]/10">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
            <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
            <div className="w-2 h-2 rounded-full bg-[#28c840]" />
          </div>
          <span className="font-mono text-[9px] sm:text-[10px] text-[#00ff88]/40 tracking-widest uppercase">
            giolocator — secure channel
          </span>
        </div>

        {/* Terminal init text */}
        <TerminalInit
          lines={terminalLines}
          onComplete={() => setShowRadar(true)}
        />

        {/* Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={
            showRadar
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.9 }
          }
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {gioCoords && (
            <Radar
              gioCoords={gioCoords}
              gioLabel={gioCity}
              visitor={visitor}
              distance={distance}
              maxRange={maxRange}
            />
          )}

          {/* Distance readout below radar */}
          {distance && (
            <div className="text-center mt-5 font-mono">
              <div className="text-[10px] sm:text-xs text-[#00ff88]/50 tracking-widest uppercase mb-1">
                Distance to visitor
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{
                  color: RADAR_GREEN,
                  textShadow: "0 0 20px rgba(0,255,136,0.4), 0 0 40px rgba(0,255,136,0.15)",
                }}
              >
                {Math.round(distance).toLocaleString()} km
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#00ff88]/40 mt-1 tracking-wider">
                {gioCity} → {visitor?.city ?? "Unknown"}
              </div>
            </div>
          )}

          {geoError && !visitor && (
            <div className="text-center mt-5 font-mono">
              <div className="text-xs text-amber-400/70 tracking-wider">
                VISITOR POSITION UNAVAILABLE
              </div>
              <div className="text-[10px] text-[#00ff88]/30 mt-1">
                IP geolocation blocked or unavailable
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-[#00ff88]/10 text-center font-mono text-[8px] sm:text-[9px] text-[#00ff88]/20 tracking-[2px] uppercase">
          CNTRLOGIC SYSTEMS — GIOLOCATOR — {new Date().toISOString().slice(0, 10)}
        </div>
      </div>
    </div>
  );
}
