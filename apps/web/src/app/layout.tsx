import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenClaw — Your Personal AI Assistant, Set Up in Minutes",
  description:
    "Get a private AI assistant that manages your email, calendar, and messages. No coding required. Set up in under 5 minutes.",
  openGraph: {
    title: "OpenClaw — Your Personal AI Assistant",
    description: "Set up in minutes. No coding required.",
    type: "website",
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
