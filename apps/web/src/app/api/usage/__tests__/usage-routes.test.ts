import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Supabase mock infrastructure ---

type ChainResult = { data: any; error: any };
let tableResults: Record<string, ChainResult>;

function createMockSupabase() {
  return {
    from: (table: string) => {
      const result = tableResults[table] ?? { data: null, error: null };
      const chain: any = {};
      const methods = ["select", "eq", "neq", "order", "limit"];
      for (const m of methods) chain[m] = vi.fn(() => chain);
      chain.single = vi.fn(() => Promise.resolve(result));
      chain.insert = vi.fn(() => Promise.resolve({ error: result.error }));
      chain.update = vi.fn(() => {
        const uChain: any = {};
        uChain.eq = vi.fn(() => Promise.resolve({ error: result.error }));
        return uChain;
      });
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createMockSupabase(),
}));

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getSession: () => mockGetSession(),
}));

const mockEnforceFreeTierLimits = vi.fn();
const mockCheckMessageLimit = vi.fn();
vi.mock("@/lib/billing/plan-enforcement", () => ({
  enforceFreeTierLimits: (...args: any[]) => mockEnforceFreeTierLimits(...args),
  checkMessageLimit: (...args: any[]) => mockCheckMessageLimit(...args),
}));

import { GET as todayGET } from "../today/route";
import { POST as recordPOST } from "../record/route";
import { GET as checkGET } from "../check/route";

// =====================================================================
// /api/usage/today
// =====================================================================

describe("GET /api/usage/today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await todayGET();
    expect(res.status).toBe(401);
  });

  it("returns free plan defaults when no assistant", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" });
    tableResults = {
      assistants: { data: null, error: null },
      users: { data: { plan: "free" }, error: null },
    };
    const res = await todayGET();
    const json = await res.json();
    expect(json).toEqual({
      messages_today: 0,
      messages_limit: 100,
      hours_active: 0,
      hours_limit: 8,
      plan: "free",
    });
  });

  it("returns real usage for free user with assistant", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" });
    tableResults = {
      assistants: { data: { id: "a1" }, error: null },
      users: { data: { plan: "free" }, error: null },
      usage_logs: { data: { messages_sent: 30, hours_active: 3.5 }, error: null },
    };
    const res = await todayGET();
    const json = await res.json();
    expect(json.messages_today).toBe(30);
    expect(json.messages_limit).toBe(100);
    expect(json.hours_active).toBe(3.5);
    expect(json.hours_limit).toBe(8);
    expect(json.plan).toBe("free");
  });

  it("returns unlimited messages and 24h limit for pro user", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" });
    tableResults = {
      assistants: { data: { id: "a1" }, error: null },
      users: { data: { plan: "pro" }, error: null },
      usage_logs: { data: { messages_sent: 500, hours_active: 12 }, error: null },
    };
    const res = await todayGET();
    const json = await res.json();
    expect(json.messages_today).toBe(500);
    expect(json.messages_limit).toBeNull();
    expect(json.hours_active).toBe(12);
    expect(json.hours_limit).toBe(24);
    expect(json.plan).toBe("pro");
  });

  it("returns 0 usage when no usage_logs row exists", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1" });
    tableResults = {
      assistants: { data: { id: "a1" }, error: null },
      users: { data: { plan: "free" }, error: null },
      usage_logs: { data: null, error: null },
    };
    const res = await todayGET();
    const json = await res.json();
    expect(json.messages_today).toBe(0);
    expect(json.hours_active).toBe(0);
  });
});

// =====================================================================
// /api/usage/record
// =====================================================================

describe("POST /api/usage/record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SIDECAR_API_TOKEN = "global-token";
  });

  function makeReq(body: any, token?: string): NextRequest {
    const headers = new Headers({ "content-type": "application/json" });
    if (token) headers.set("authorization", `Bearer ${token}`);
    return new NextRequest("http://localhost/api/usage/record", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("returns 401 with no auth header", async () => {
    const res = await recordPOST(
      new NextRequest("http://localhost/api/usage/record", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when assistant_id missing", async () => {
    const res = await recordPOST(makeReq({}, "global-token"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when assistant not found", async () => {
    tableResults = {
      assistants: { data: null, error: null },
    };
    const res = await recordPOST(makeReq({ assistant_id: "bad" }, "global-token"));
    expect(res.status).toBe(404);
  });

  it("returns 401 with invalid sidecar token", async () => {
    tableResults = {
      assistants: { data: { id: "a1", user_id: "u1", sidecar_token: "tok-a1" }, error: null },
    };
    const res = await recordPOST(makeReq({ assistant_id: "a1" }, "wrong-token"));
    expect(res.status).toBe(401);
  });

  it("accepts global SIDECAR_API_TOKEN even without per-assistant token", async () => {
    tableResults = {
      assistants: { data: { id: "a1", user_id: "u1", sidecar_token: null }, error: null },
      usage_logs: { data: null, error: null },
    };
    mockEnforceFreeTierLimits.mockResolvedValue({ allowed: true });

    const res = await recordPOST(
      makeReq({ assistant_id: "a1", messages_sent: 5 }, "global-token"),
    );
    const json = await res.json();
    expect(json.recorded).toBe(true);
    expect(json.throttled).toBe(false);
  });

  it("accepts per-assistant sidecar token", async () => {
    tableResults = {
      assistants: { data: { id: "a1", user_id: "u1", sidecar_token: "tok-a1" }, error: null },
      usage_logs: { data: null, error: null },
    };
    mockEnforceFreeTierLimits.mockResolvedValue({ allowed: true });

    const res = await recordPOST(
      makeReq({ assistant_id: "a1", messages_sent: 10, hours_active: 1.5 }, "tok-a1"),
    );
    const json = await res.json();
    expect(json.recorded).toBe(true);
  });

  it("returns throttled=true when enforcement denies", async () => {
    tableResults = {
      assistants: { data: { id: "a1", user_id: "u1", sidecar_token: null }, error: null },
      usage_logs: { data: null, error: null },
    };
    mockEnforceFreeTierLimits.mockResolvedValue({
      allowed: false,
      reason: "Daily message limit reached.",
    });

    const res = await recordPOST(
      makeReq({ assistant_id: "a1", messages_sent: 100 }, "global-token"),
    );
    const json = await res.json();
    expect(json.recorded).toBe(true);
    expect(json.throttled).toBe(true);
    expect(json.reason).toContain("limit");
  });
});

// =====================================================================
// /api/usage/check
// =====================================================================

describe("GET /api/usage/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SIDECAR_API_TOKEN = "global-token";
  });

  function makeReq(params: Record<string, string>, token?: string): NextRequest {
    const url = new URL("http://localhost/api/usage/check");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const headers = new Headers();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return new NextRequest(url.toString(), { headers });
  }

  it("returns 401 with no token", async () => {
    const res = await checkGET(makeReq({ assistant_id: "a1" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong token", async () => {
    const res = await checkGET(makeReq({ assistant_id: "a1" }, "bad"));
    expect(res.status).toBe(401);
  });

  it("returns 400 without assistant_id param", async () => {
    const res = await checkGET(makeReq({}, "global-token"));
    expect(res.status).toBe(400);
  });

  it("returns allowed=true for pro user", async () => {
    mockCheckMessageLimit.mockResolvedValue({
      allowed: true,
      used: 500,
      limit: -1,
      plan: "pro",
    });
    const res = await checkGET(makeReq({ assistant_id: "a1" }, "global-token"));
    const json = await res.json();
    expect(json.allowed).toBe(true);
    expect(json.plan).toBe("pro");
    expect(json.messageLimit).toBe(-1);
  });

  it("returns allowed=false for free user at limit", async () => {
    mockCheckMessageLimit.mockResolvedValue({
      allowed: false,
      used: 50,
      limit: 50,
      plan: "free",
    });
    const res = await checkGET(makeReq({ assistant_id: "a1" }, "global-token"));
    const json = await res.json();
    expect(json.allowed).toBe(false);
    expect(json.messagesUsed).toBe(50);
    expect(json.messageLimit).toBe(50);
    expect(json.plan).toBe("free");
  });
});
