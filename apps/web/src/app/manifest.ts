import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HandsOff",
    short_name: "HandsOff",
    description:
      "Your personal AI assistant that handles email, calendar, research, and more.",
    start_url: "/",
    display: "standalone",
    theme_color: "#020617", // slate-950
    background_color: "#020617",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
