"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import type { MapStop } from "@/lib/public/map-stops";

type Props = {
  stops: MapStop[];
};

// Blueprint+ D3 — clustering + flyout cards, smooth zoom on cluster click
export default function StopsMap({ stops }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [4.8902, 52.371],
      zoom: 12.5,
      pitch: 35,
      bearing: -8,
      antialias: true,
      fadeDuration: 200,
      cooperativeGestures: true,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      if (!mapRef.current) return;

      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: stops.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
          properties: { id: s.id, name: s.name, area: s.area ?? "", slug: s.slug },
        })),
      };

      map.addSource("stops", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "stops",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#C9963A",
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#F7F3EC",
          "circle-stroke-opacity": 0.3,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stops",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#0D0D0D" },
      });

      // Individual stop dots
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "stops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#C9963A",
          "circle-radius": 6,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#F7F3EC",
          "circle-opacity": 0.9,
        },
      });

      // Blueprint+ D3 — click cluster → smooth zoom to bounds
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features[0]) return;
        const clusterId = features[0].properties?.cluster_id as number;
        const source = map.getSource("stops") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !zoom) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom + 0.5, duration: 500 });
        });
      });

      // Blueprint+ D3 — click individual stop → flyout card popup
      map.on("click", "unclustered-point", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const { name, area, slug } = feat.properties as { name: string; area: string; slug: string };
        const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];

        new mapboxgl.Popup({ offset: 10, closeButton: true, maxWidth: "220px" })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:inherit;padding:4px 2px">
               <p style="font-weight:600;font-size:13px;margin:0 0 2px">${name}</p>
               ${area ? `<p style="font-size:11px;color:#C9963A;margin:0 0 6px">${area}</p>` : ""}
               <a href="/stops/${slug}" style="font-size:11px;color:#2E86C1;text-decoration:underline">View stop →</a>
             </div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [stops]);

  const hasToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] rounded-2xl overflow-hidden border border-warm-cream/10 shadow-2xl">
      <div ref={containerRef} className="absolute inset-0 bg-ink-black" />
      {!hasToken && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-warm-cream/50">
          Map preview loading — Mapbox token required.
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-black/60" />
      <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] tracking-[0.2em] uppercase text-warm-cream/60 font-semibold">
        {stops.length > 0 ? `${stops.length} stops` : "Amsterdam"} · Layover Legends
      </div>
    </div>
  );
}
