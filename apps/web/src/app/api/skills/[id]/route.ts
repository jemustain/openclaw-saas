import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sidecarFetch } from "@/lib/sidecar/client";
import { getSkillById } from "@/lib/skills/catalog";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: skillId } = await params;
    const { action } = await req.json();

    if (!action || !["install", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'install' or 'remove'." },
        { status: 400 },
      );
    }

    // Plan enforcement: free users can't install pro/starter skills
    if (action === "install") {
      const skill = getSkillById(skillId);
      if (skill && skill.tier !== "free") {
        const supabase: any = await createClient();
        const { data: user } = await supabase
          .from("users")
          .select("plan")
          .eq("id", session.userId)
          .single();

        const plan = user?.plan ?? "free";
        if (plan === "free") {
          return NextResponse.json(
            { error: `This skill requires the ${skill.tier} plan. Please upgrade.` },
            { status: 403 },
          );
        }
      }
    }

    const endpoint = action === "install" ? "/skills/install" : "/skills/remove";
    const res = await sidecarFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ name: skillId }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Surface a friendly message if no assistant is running
      if (res.status === 404 && data?.error?.includes("No active assistant")) {
        return NextResponse.json(
          { error: "Your assistant is not running. Launch it from the dashboard to manage skills." },
          { status: 404 },
        );
      }
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`Failed to ${req.method} skill:`, err);
    // Network errors likely mean the VM/sidecar is unreachable
    if (err.cause?.code === "ECONNREFUSED" || err.cause?.code === "ETIMEDOUT" || err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Could not reach your assistant. It may be starting up or offline." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to process skill action" },
      { status: 500 },
    );
  }
}
