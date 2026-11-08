import type { MetadataRoute } from "next";

/** Lets people add the Coach Me 2 portal to their phone's home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coach Me 2",
    short_name: "Coach Me 2",
    description: "Coaching for teens 14–19: your coach, goals, sessions, and chat.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#eef2f8",
    theme_color: "#13263d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
