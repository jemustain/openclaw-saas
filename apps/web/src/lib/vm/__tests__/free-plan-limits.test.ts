import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/vm/lifecycle", () => ({ suspendAssistant: vi.fn().mockResolvedValue({}) }));

import { getDailyUptimeHours, hasRemainingHoursToday, FREE_PLAN_DAILY_HOURS } from "../free-plan-limits";
import { createClient } from "@/lib/supabase/server";

function mockChain(data: any) {
  const c: any = {};
  for (const m of ["from","select","insert","eq","gte","lte","in","single"]) c[m] = vi.fn().mockReturnValue(c);
  c.lte = vi.fn().mockResolvedValue({ data, error: null });
  return c;
}

describe("free-plan-limits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("constant is 8", () => { expect(FREE_PLAN_DAILY_HOURS).toBe(8); });

  it("returns 0 with no logs", async () => {
    (createClient as any).mockResolvedValue(mockChain([]));
    expect(await getDailyUptimeHours("a1")).toBe(0);
  });

  it("sums seconds to hours", async () => {
    (createClient as any).mockResolvedValue(mockChain([{duration_seconds:3600},{duration_seconds:7200}]));
    expect(await getDailyUptimeHours("a1")).toBe(3);
  });

  it("not exceeded under limit", async () => {
    (createClient as any).mockResolvedValue(mockChain([{duration_seconds:3600}]));
    const r = await hasRemainingHoursToday("a1");
    expect(r.exceeded).toBe(false);
    expect(r.remaining).toBe(7);
  });

  it("exceeded at limit", async () => {
    (createClient as any).mockResolvedValue(mockChain([{duration_seconds:28800}]));
    const r = await hasRemainingHoursToday("a1");
    expect(r.exceeded).toBe(true);
    expect(r.remaining).toBe(0);
  });
});
