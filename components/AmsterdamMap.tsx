"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";

// Iconic stops the tour might visit. Lat/lng pairs are in [lng, lat] order
// because that's how Mapbox/GeoJSON expects them.
const TOUR_STOPS: Array<{ name: string; coords: [number, number] }> = [
  { name: "Centraal Station", coords: [4.9006, 52.3789] },
  { name: "Anne Frank House", coords: [4.884, 52.3752] },
  { name: "Dam Square", coords: [4.8932, 52.3731] },
  { name: "Bloemenmarkt", coords: [4.8917, 52.3674] },
  { name: "Rijksmuseum", coords: [4.8852, 52.36] },
  { name: "Vondelpark", coords: [4.8688, 52.3579] },
];

const ROUTE_GEOJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: TOUR_STOPS.map((s) => s.coords),
  },
};

export default function AmsterdamMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const rotationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    if (!token || !containerRef.current) {
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [4.8902, 52.371],
      zoom: 13.2,
      pitch: 45,
      bearing: -10,
      antialias: true,
      // Performance: skip attribution/logo until interaction; keep fadeDuration short.
      fadeDuration: 200,
      // Cooperative gestures — scroll the page over the map without zooming it
      // unless the user clicks first.
      cooperativeGestures: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Tour-route line: dotted brand-orange line.
      map.addSource("tour-route", {
        type: "geojson",
        data: ROUTE_GEOJSON,
      });
      map.addLayer({
        id: "tour-route-line",
        type: "line",
        source: "tour-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#F97316",
          "line-width": 3,
          "line-dasharray": [1.5, 1.5],
          "line-opacity": 0.9,
        },
      });

      // Build markers with custom HTML — orange pulsing dots.
      TOUR_STOPS.forEach((stop) => {
        const el = document.createElement("div");
        el.className = "lal-marker";
        el.setAttribute("aria-label", stop.name);
        el.innerHTML =
          '<span class="lal-marker__pulse"></span><span class="lal-marker__dot"></span>';
        new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(stop.coords)
          .setPopup(
            new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(
              `<strong>${stop.name}</strong>`,
            ),
          )
          .addTo(map);
      });

      // Slow auto-rotate to give a cinematic feel without disabling interaction.
      let lastBearing = map.getBearing();
      const rotate = () => {
        if (!mapRef.current) return;
        // Pause if the user is interacting.
        if (
          !mapRef.current.isMoving() &&
          !mapRef.current.isZooming() &&
          !mapRef.current.isRotating() &&
          !mapRef.current.isEasing()
        ) {
          lastBearing = (lastBearing + 0.05) % 360;
          mapRef.current.setBearing(lastBearing);
        }
        rotationFrameRef.current = window.requestAnimationFrame(rotate);
      };
      rotationFrameRef.current = window.requestAnimationFrame(rotate);
    });

    return () => {
      if (rotationFrameRef.current !== null) {
        window.cancelAnimationFrame(rotationFrameRef.current);
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Graceful fallback when the token is missing — keep the layout stable so the
  // page still looks intentional.
  const hasToken =
    !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="relative w-full aspect-square max-w-xl rounded-2xl overflow-hidden border border-brand-cream/10 shadow-2xl">
      <div ref={containerRef} className="absolute inset-0 bg-brand-navy" />
      {!hasToken && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-cream/60 px-6 text-center">
          Map preview is loading. (Mapbox token not configured.)
        </div>
      )}

      {/* Subtle vignette + brand watermark layered above the map */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-navy/70" />
      <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] tracking-[0.2em] uppercase text-brand-cream/70 font-semibold">
        Amsterdam · Layover Legends
      </div>
    </div>
  );
}
