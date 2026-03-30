import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSuspendAssistant = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/vm/lifecycle", () => ({ suspendAssistant: (...a: any[]) => mockSuspendAssistant(...a) }));

import { getDailyUptimeHours, hasRemainingHoursToday, logVmUptime, enforceFreePlanLimits, FREE_PLAN_DAILY_HOURS } from "../free-plan-limits";
import { createClient } from "@/lib/supabase/server";

function mockChain(overrides: Record<string, any> = {}) {
  const c: any = {};
  for (const m of ["from","select","insert","eq","gte","lte","in","single"]) c[m] = vi.fn().mockReturnValue(c);
  c.lte = vi.fn().mockResolvedValue({ data: [], error: null });
  // Apply overrides
  for (const [k, v] of Object.entries(overrides)) c[k] = vi.fn(v);
  return c;
}

describe("free-plan-limits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("constant is 8", () => { expect(FREE_PLAN_DAILY_HOURS).toBe(8); });

  it("returns 0 with no logs", async () => {
    const c = mockChain();
    c.lte = vi.fn().mockResolvedValue({ data: [], error: null });
    (createClient as any).mockReturnValue(c);
    expect(await getDailyUptimeHours("a1")).toBe(0);
  });

  it("sums seconds to hours", async () => {
    const c = mockChain();
    c.lte = vi.fn().mockResolvedValue({ data: [{duration_seconds:3600},{duration_seconds:7200}], error: null });
    (createClient as any).mockReturnValue(c);
    expect(await getDailyUptimeHours("a1")).toBe(3);
  });

  it("returns 0 on query error", async () => {
    const c = mockChain();
    c.lte = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    (createClient as any).mockReturnValue(c);
    expect(await getDailyUptimeHours("a1")).toBe(0);
  });

  it("not exceeded under limit", async () => {
    const c = mockChain();
    c.lte = vi.fn().mockResolvedValue({ data: [{duration_seconds:3600}], error: null });
    (createClient as any).mockReturnValue(c);
    const r = await hasRemainingHoursToday("a1");
    expect(r.exceeded).toBe(false);
    expect(r.remaining).toBe(7);
  });

  it("exceeded at limit", async () => {
    const c = mockChain();
    c.lte = vi.fn().mockResolvedValue({ data: [{duration_seconds:28800}], error: null });
    (createClient as any).mockReturnValue(c);
    const r = await hasRemainingHoursToday("a1");
    expect(r.exceeded).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it("logVmUptime inserts usage log", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const c = mockChain();
    c.insert = mockInsert;
    (createClient as any).mockReturnValue(c);
    await logVmUptime("a1", 3600);
    expect(c.from).toHaveBeenCalledWith("usage_logs");
  });

  it("logVmUptime handles error", async () => {
    const c = mockChain();
    c.insert = vi.fn().mockResolvedValue({ error: { message: 'insert fail' } });
    (createClient as any).mockReturnValue(c);
    // Should not throw, just log
    await logVmUptime("a1", 3600);
  });

  it("enforceFreePlanLimits returns 0 on query error", async () => {
    const c = mockChain();
    c.eq = vi.fn().mockReturnValue(c);
    c.select = vi.fn().mockReturnValue(c);
    // Make the final query return error
    (createClient as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      }),
    });
    const result = await enforceFreePlanLimits();
    expect(result).toEqual({ checked: 0, suspended: 0 });
  });

  it("enforceFreePlanLimits returns 0 when no active free assistants", async () => {
    (createClient as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      }),
    });
    const result = await enforceFreePlanLimits();
    expect(result).toEqual({ checked: 0, suspended: 0 });
  });

  it("enforceFreePlanLimits suspends exceeded assistants", async () => {
    // First call: get active free assistants
    const mainClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'assistants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'a1', user_id: 'u1' }], error: null }),
              }),
            }),
          };
        }
        if (table === 'usage_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockResolvedValue({ data: [{ duration_seconds: 30000 }], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    (createClient as any).mockReturnValue(mainClient);
    mockSuspendAssistant.mockResolvedValue(undefined);
    const result = await enforceFreePlanLimits();
    expect(result.checked).toBe(1);
    expect(result.suspended).toBe(1);
    expect(mockSuspendAssistant).toHaveBeenCalledWith('a1');
  });

  it("enforceFreePlanLimits handles suspend failure", async () => {
    const mainClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'assistants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'a2', user_id: 'u2' }], error: null }),
              }),
            }),
          };
        }
        if (table === 'usage_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockResolvedValue({ data: [{ duration_seconds: 30000 }], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    (createClient as any).mockReturnValue(mainClient);
    mockSuspendAssistant.mockRejectedValue(new Error('suspend failed'));
    const result = await enforceFreePlanLimits();
    expect(result.checked).toBe(1);
    expect(result.suspended).toBe(0);
  });

  it("enforceFreePlanLimits skips non-exceeded assistants", async () => {
    const mainClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'assistants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ data: [{ id: 'a3', user_id: 'u3' }], error: null }),
              }),
            }),
          };
        }
        if (table === 'usage_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockResolvedValue({ data: [{ duration_seconds: 100 }], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    (createClient as any).mockReturnValue(mainClient);
    const result = await enforceFreePlanLimits();
    expect(result.checked).toBe(1);
    expect(result.suspended).toBe(0);
    expect(mockSuspendAssistant).not.toHaveBeenCalled();
  });
});
