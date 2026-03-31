import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ordo",
    short_name: "Ordo",
    description:
      "Ordo is a business management system that brings clients, tasks, and team operations into one workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "var(--brand-600)",
    icons: [
      {
        src: "/brand/app_icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
