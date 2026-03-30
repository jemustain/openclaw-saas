import { NextRequest, NextResponse } from "next/server";
import { enforceFreePlanLimits } from "@/lib/vm/free-plan-limits";
import { env } from "@/lib/env";
import { ERR, apiError, handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const cronSecret = env("CRON_SECRET");
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }
  try {
    const result = await enforceFreePlanLimits();
    console.log(`[enforce-limits] checked=${result.checked} suspended=${result.suspended}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[enforce-limits] failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
