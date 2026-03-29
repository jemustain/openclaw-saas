import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shiftworker.ai";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: "ShiftWorker — AI Agent Hosting Platform",
  description:
    "ShiftWorker provisions and manages OpenClaw instances for you. Get a personal AI agent that handles your email, calendar, research, and more — no servers, no setup.",
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "ShiftWorker — AI Agent Hosting Platform",
    description:
      "ShiftWorker provisions and manages OpenClaw instances for you. Get a personal AI agent that handles your email, calendar, research, and more — no servers, no setup.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ShiftWorker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShiftWorker — AI Agent Hosting Platform",
    description:
      "ShiftWorker provisions and manages OpenClaw instances for you. Get a personal AI agent that handles your email, calendar, research, and more — no servers, no setup.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
