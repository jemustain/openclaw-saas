import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ShiftWorker — AI Agent Hosting Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#f8fafc",
            letterSpacing: "-0.02em",
          }}
        >
          ShiftWorker
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#94a3b8",
            marginTop: 16,
          }}
        >
          Your Personal AI Assistant
        </div>
      </div>
    ),
    { ...size }
  );
}
