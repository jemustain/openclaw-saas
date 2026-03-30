import { NextRequest, NextResponse } from "next/server";
import { checkMessageLimit } from "@/lib/billing/plan-enforcement";
import { apiError, ERR, handleApiError } from "@/lib/errors";

/**
 * GET /api/usage/check?assistant_id=xxx
 *
 * Sidecar calls this before processing a message to check limits.
 * Auth: Bearer <SIDECAR_TOKEN>
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.SIDECAR_API_TOKEN) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  const assistantId = req.nextUrl.searchParams.get("assistant_id");
  if (!assistantId) {
    return NextResponse.json(
      { error: "assistant_id query param required" },
      { status: 400 },
    );
  }

  const result = await checkMessageLimit(assistantId);

  return NextResponse.json({
    allowed: result.allowed,
    messagesUsed: result.used,
    messageLimit: result.limit,
    plan: result.plan,
  });
}
