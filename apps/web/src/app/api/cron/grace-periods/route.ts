import { NextResponse } from "next/server";
import { processExpiredGracePeriods } from "@/lib/billing/cancellation";

/**
 * GET /api/cron/grace-periods
 *
 * Cron endpoint to process expired grace periods and destroy orphaned VMs.
 * Secure with CRON_SECRET env var.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processExpiredGracePeriods();

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    timestamp: new Date().toISOString(),
  });
}
