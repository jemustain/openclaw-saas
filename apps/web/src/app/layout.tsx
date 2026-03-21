import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://handsoff.app";

export const metadata: Metadata = {
  title: "HandsOff — Your Personal AI Assistant That Actually Does Things",
  description:
    "Not a chatbot. A doer. HandsOff gives you a personal AI assistant that handles your email, calendar, research, and more — all through the messaging app you already use.",
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon.ico" },
  themeColor: "#020617", // slate-950
  openGraph: {
    title: "HandsOff — Your Personal AI Assistant That Actually Does Things",
    description:
      "Not a chatbot. A doer. HandsOff gives you a personal AI assistant that handles your email, calendar, research, and more — all through the messaging app you already use.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HandsOff" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HandsOff — Your Personal AI Assistant That Actually Does Things",
    description:
      "Not a chatbot. A doer. HandsOff gives you a personal AI assistant that handles your email, calendar, research, and more.",
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
