import { NextResponse } from "next/server";
import { sidecarFetch } from "@/lib/sidecar/client";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const res = await sidecarFetch("/skills");
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'skills/list');
  }
}
