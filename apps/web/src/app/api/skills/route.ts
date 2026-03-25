import { NextResponse } from "next/server";
import { sidecarFetch } from "@/lib/sidecar/client";

export async function GET() {
  try {
    const res = await sidecarFetch("/skills");
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Failed to fetch skills:", err);
    return NextResponse.json(
      { error: "Failed to fetch skills", details: err.message },
      { status: 500 },
    );
  }
}
