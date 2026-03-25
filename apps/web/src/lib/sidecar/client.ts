import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

const SIDECAR_PORT = 8787;

export async function getSidecarConnection(): Promise<{ baseUrl: string; token: string } | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase: any = await createClient();
  const { data: assistant } = await supabase
    .from("assistants")
    .select("ip_address, sidecar_token")
    .eq("user_id", session.userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!assistant?.ip_address || !assistant?.sidecar_token) return null;

  return {
    baseUrl: `http://${assistant.ip_address}:${SIDECAR_PORT}`,
    token: assistant.sidecar_token,
  };
}

export async function sidecarFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const conn = await getSidecarConnection();
  if (!conn) {
    return new Response(JSON.stringify({ error: "No active assistant found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return fetch(`${conn.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.token}`,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
}
