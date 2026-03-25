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
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`Failed to ${req.method} skill:`, err);
    return NextResponse.json(
      { error: "Failed to process skill action", details: err.message },
      { status: 500 },
    );
  }
}
