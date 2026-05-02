"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { BuilderStop } from "@/lib/builder/types";
import { SCHIPHOL_LNG, SCHIPHOL_LAT } from "@/lib/builder/types";

type Props = {
  orderedStops: BuilderStop[];
  geometry: GeoJSON.Feature<GeoJSON.LineString> | null;
  onRemoveStop?: (id: string) => void;
  highlightId?: string | null;
};

const GOLD = "#C9963A";
const CREAM = "#F7F3EC";
const CANAL = "#1B4F72";
const INK = "#0D0D0D";

export default function RouteMap({ orderedStops, geometry, onRemoveStop, highlightId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [SCHIPHOL_LNG, SCHIPHOL_LAT],
      zoom: 11,
      pitch: 20,
      antialias: true,
      cooperativeGestures: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => renderRoute(map));

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers + route when stops/geometry change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    renderRoute(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedStops, geometry]);

  function renderRoute(map: mapboxgl.Map) {
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Cancel animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Remove existing layers/sources
    for (const id of ["route-line", "route-line-bg"]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource("route")) map.removeSource("route");

    // Airport marker
    const airportEl = document.createElement("div");
    airportEl.className = "builder-airport-marker";
    airportEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${CANAL}" width="20" height="20"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/></svg>`;
    markersRef.current.push(
      new mapboxgl.Marker(airportEl)
        .setLngLat([SCHIPHOL_LNG, SCHIPHOL_LAT])
        .setPopup(new mapboxgl.Popup({ offset: 10 }).setHTML(`<p style="font-size:12px;margin:0;font-weight:600">Schiphol Airport</p>`))
        .addTo(map),
    );

    // Stop markers
    orderedStops.forEach((stop, idx) => {
      const el = document.createElement("div");
      el.className = "builder-stop-marker";
      el.innerHTML = `<span>${idx + 1}</span>`;
      if (highlightId === stop.id) el.classList.add("highlighted");

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false })
        .setHTML(`
          <div style="font-family:inherit;padding:4px 2px;min-width:140px">
            <p style="font-weight:600;font-size:13px;margin:0 0 4px">${stop.name}</p>
            <p style="font-size:11px;color:#888;margin:0 0 6px">${stop.area ?? ""}</p>
            ${onRemoveStop
              ? `<button onclick="window.__builderRemove('${stop.id}')" style="font-size:11px;color:#C7221F;cursor:pointer;background:none;border:none;padding:0">Remove ×</button>`
              : ""}
          </div>
        `);

      markersRef.current.push(
        new mapboxgl.Marker(el)
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(popup)
          .addTo(map),
      );
    });

    // Wire up remove callback via global (popup HTML can't directly call React)
    if (onRemoveStop) {
      (window as unknown as Record<string, unknown>).__builderRemove = (id: string) => {
        onRemoveStop(id);
        // Close any open popups
        markersRef.current.forEach((m) => m.getPopup()?.remove());
      };
    }

    // Fit bounds to all stops + airport
    if (orderedStops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([SCHIPHOL_LNG, SCHIPHOL_LAT]);
      orderedStops.forEach((s) => bounds.extend([s.longitude, s.latitude]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 });
    }

    // Draw route geometry
    if (geometry) {
      map.addSource("route", { type: "geojson", data: geometry });

      // Background line
      map.addLayer({
        id: "route-line-bg",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": GOLD,
          "line-width": 6,
          "line-opacity": 0.15,
        },
      });

      // Animated dashed line
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": GOLD,
          "line-width": 3,
          "line-dasharray": [0, 4, 3],
        },
      });

      let step = 0;
      const dashArrays = [
        [0, 4, 3],
        [0.5, 4, 2.5],
        [1, 4, 2],
        [1.5, 4, 1.5],
        [2, 4, 1],
        [2.5, 4, 0.5],
        [3, 4, 0],
        [0, 0.5, 3, 3.5],
        [0, 1, 3, 3],
        [0, 1.5, 3, 2.5],
        [0, 2, 3, 2],
        [0, 2.5, 3, 1.5],
        [0, 3, 3, 1],
        [0, 3.5, 3, 0.5],
        [0, 4, 3, 0],
      ];

      let lastTime = 0;
      function animateDash(time: number) {
        if (time - lastTime > 50) {
          step = (step + 1) % dashArrays.length;
          if (map.getLayer("route-line")) {
            map.setPaintProperty("route-line", "line-dasharray", dashArrays[step]);
          }
          lastTime = time;
        }
        animFrameRef.current = requestAnimationFrame(animateDash);
      }
      animFrameRef.current = requestAnimationFrame(animateDash);
    }
  }

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden border border-warm-cream/10">
      <div ref={containerRef} className="absolute inset-0 bg-ink-black" />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-warm-cream/50">
          Map requires Mapbox token
        </div>
      )}
    </div>
  );
}
