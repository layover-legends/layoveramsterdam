import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Layover Legends Driver",
    short_name: "LL Driver",
    description: "Daily roster and tour management for Layover Legends guides",
    start_url: "/driver/today",
    scope: "/driver",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#C9963A",
    background_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png",         sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png",         sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-192.png",sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png",sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["productivity", "travel"],
  };
}
