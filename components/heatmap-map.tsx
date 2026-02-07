"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet.heat";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { HeatmapData, TopPhoto, ReviewPoint } from "@/lib/types";

// ── Heat layer component (uses useMap hook) ──

function HeatLayer({ points }: { points: HeatmapData["heatPoints"] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const heatData: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lng,
      Math.min(p.weight / 50, 1), // normalize weights so clusters don't overpower
    ]);

    const heat = L.heatLayer(heatData, {
      radius: 18,
      blur: 20,
      maxZoom: 10,
      minOpacity: 0.3,
      gradient: {
        0.2: "#1e3a5f",
        0.4: "#3b82f6",
        0.6: "#22c55e",
        0.8: "#facc15",
        1.0: "#ef4444",
      },
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

// ── Photo marker with popup ──

function PhotoMarker({ photo }: { photo: TopPhoto }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
          cursor: pointer;
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -8],
      }),
    []
  );

  const viewsFormatted = photo.imageViews.toLocaleString();

  return (
    <Marker position={[photo.lat, photo.lng]} icon={icon}>
      <Popup maxWidth={320} minWidth={280}>
        <div className="p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.imagePath}
            alt={photo.description || photo.title}
            className="w-full h-48 object-cover rounded-t-[0.7rem]"
            loading="lazy"
          />
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">{viewsFormatted} views</span>
              <span className="text-[10px] text-muted-foreground">{photo.date}</span>
            </div>
            {photo.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {photo.description}
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ── Review marker with popup ──

function ReviewMarker({ review }: { review: ReviewPoint }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(250, 204, 21, 0.85);
          border: 1.5px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 4px rgba(250, 204, 21, 0.5);
          cursor: pointer;
        "></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
        popupAnchor: [0, -6],
      }),
    []
  );

  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

  return (
    <Marker position={[review.lat, review.lng]} icon={icon}>
      <Popup maxWidth={280} minWidth={220}>
        <div className="px-3 py-2.5">
          <p className="text-xs font-semibold mb-0.5">{review.name}</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 text-xs tracking-wider">{stars}</span>
            <span className="text-[10px] text-muted-foreground">{review.date}</span>
          </div>
          {review.text && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
              {review.text}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ── Dark mode tile detection ──

function useDarkMode() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

// ── Main map component ──

export default function HeatmapMap({ data }: { data: HeatmapData }) {
  const isDark = useDarkMode();

  // Compute center from heat points (weighted centroid)
  const center = useMemo(() => {
    if (data.heatPoints.length === 0) return [20, 10] as [number, number];
    let totalWeight = 0;
    let latSum = 0;
    let lngSum = 0;
    for (const p of data.heatPoints) {
      latSum += p.lat * p.weight;
      lngSum += p.lng * p.weight;
      totalWeight += p.weight;
    }
    return [latSum / totalWeight, lngSum / totalWeight] as [number, number];
  }, [data.heatPoints]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      center={center}
      zoom={3}
      minZoom={2}
      maxZoom={16}
      scrollWheelZoom={true}
      style={{ height: "450px", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      <HeatLayer points={data.heatPoints} />
      {data.reviews?.map((review, i) => (
        <ReviewMarker key={`r-${i}`} review={review} />
      ))}
      {data.topPhotos.map((photo, i) => (
        <PhotoMarker key={`p-${i}`} photo={photo} />
      ))}
    </MapContainer>
  );
}
