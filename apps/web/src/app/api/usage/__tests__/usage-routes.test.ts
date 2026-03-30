import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks -----------------------------------------------------------

// Mock Supabase: chainable query builder
function mockChain(resolvedData: any, resolvedError: any = null) {
  const chain: any = {};
  const methods = [
    "from",
    "select",
    "insert",
    "update",
    "eq",
    "neq",
    "order",
    "limit",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() =>
    Promise.resolve({ data: resolvedData, error: resolvedError }),
  );
  // insert doesn't call .single()
  chain.insert = vi.fn(() =>
    Promise.resolve({ error: resolvedError }),
  );
  return chain;
}

let supabaseChains: Record<string, ReturnType<typeof mockChain>>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    // Return a proxy that routes .from(table) to the right mock chain
    return {
      from: (table: string) => {
        const chain = supabaseChains[table];
        if (!chain) throw new Error(`Unmocked table: ${table}`);
        chain.from(table);
        return chain;
      },
    };
  },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/billing/plan-enforcement", () => ({
  enforceFreeTierLimits: vi.fn(),
  checkMessageLimit: vi.fn(),
}));

import { getSession } from "@/lib/auth/session";
import { enforceFreeTierLimits, checkMessageLimit } from "@/lib/billing/plan-enforcement";

// --- /api/usage/today -------------------------------------------------

describe("GET /api/usage/today", () => {
  let GET: any;

  beforeEach(async () => {
    vi.resetModules();
    // Re-import to pick up fresh mocks
    const mod = await import(
      "@/app/api/usage/today/route"
    );
    GET = mod.GET;
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns free plan defaults when no assistant", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1" } as any);
    supabaseChains = {
      assistants: mockChain(null),
      users: mockChain({ plan: "free" }),
      usage_logs: mockChain(null),
    };

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({
      messages_today: 0,
      messages_limit: 50,
      hours_active: 0,
      hours_limit: 8,
      plan: "free",
    });
  });

  it("returns real usage for free user", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1" } as any);
    supabaseChains = {
      assistants: mockChain({ id: "a1" }),
      users: mockChain({ plan: "free" }),
      usage_logs: mockChain({ messages_sent: 30, hours_active: 3.5 }),
    };

    const res = await GET();
    const json = await res.json();
    expect(json.messages_today).toBe(30);
    expect(json.messages_limit).toBe(50);
    expect(json.hours_active).toBe(3.5);
    expect(json.hours_limit).toBe(8);
  });

  it("returns unlimited messages for pro user", async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: "u1" } as any);
    supabaseChains = {
      assistants: mockChain({ id: "a1" }),
      users: mockChain({ plan: "pro" }),
      usage_logs: mockChain({ messages_sent: 500, hours_active: 12 }),
    };

    const res = await GET();
    const json = await res.json();
    expect(json.messages_limit).toBeNull();
    expect(json.hours_limit).toBe(24);
    expect(json.messages_today).toBe(500);
  });
});

// --- /api/usage/record ------------------------------------------------

describe("POST /api/usage/record", () => {
  let POST: any;

  beforeEach(async () => {
    vi.resetModules();
    process.env.SIDECAR_API_TOKEN = "global-token";
    const mod = await import("@/app/api/usage/record/route");
    POST = mod.POST;
  });

  function makeReq(body: any, token?: string) {
    const headers = new Headers();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return new Request("http://localhost/api/usage/record", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("returns 401 with no auth header", async () => {
    const res = await POST(new Request("http://localhost/api/usage/record", {
      method: "POST",
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when assistant_id missing", async () => {
    const res = await POST(makeReq({}, "global-token"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when assistant not found", async () => {
    supabaseChains = {
      assistants: mockChain(null),
      usage_logs: mockChain(null),
    };
    const res = await POST(makeReq({ assistant_id: "bad" }, "global-token"));
    expect(res.status).toBe(404);
  });

  it("returns 401 with invalid token", async () => {
    supabaseChains = {
      assistants: mockChain({ id: "a1", user_id: "u1", sidecar_token: "tok-a1" }),
      usage_logs: mockChain(null),
    };
    const res = await POST(
      makeReq({ assistant_id: "a1" }, "wrong-token"),
    );
    expect(res.status).toBe(401);
  });

  it("inserts new usage log and returns recorded", async () => {
    const usageMock = mockChain(null); // no existing row
    supabaseChains = {
      assistants: mockChain({ id: "a1", user_id: "u1", sidecar_token: "tok-a1" }),
      usage_logs: usageMock,
    };
    vi.mocked(enforceFreeTierLimits).mockResolvedValue({ allowed: true });

    const res = await POST(
      makeReq(
        { assistant_id: "a1", messages_sent: 10, hours_active: 1.5, api_tokens_used: 200 },
        "tok-a1",
      ),
    );
    const json = await res.json();
    expect(json.recorded).toBe(true);
    expect(json.throttled).toBe(false);
    expect(usageMock.insert).toHaveBeenCalled();
  });

  it("updates existing usage log taking max values", async () => {
    const usageMock = mockChain({
      id: "log1",
      messages_sent: 5,
      hours_active: 1,
      api_tokens_used: 100,
    });
    supabaseChains = {
      assistants: mockChain({ id: "a1", user_id: "u1", sidecar_token: null }),
      usage_logs: usageMock,
    };
    vi.mocked(enforceFreeTierLimits).mockResolvedValue({ allowed: true });

    const res = await POST(
      makeReq(
        { assistant_id: "a1", messages_sent: 10, hours_active: 0.5, api_tokens_used: 50 },
        "global-token",
      ),
    );
    const json = await res.json();
    expect(json.recorded).toBe(true);
    expect(usageMock.update).toHaveBeenCalled();
  });

  it("returns throttled when over limit", async () => {
    supabaseChains = {
      assistants: mockChain({ id: "a1", user_id: "u1", sidecar_token: null }),
      usage_logs: mockChain(null),
    };
    vi.mocked(enforceFreeTierLimits).mockResolvedValue({
      allowed: false,
      reason: "Daily message limit reached.",
    });

    const res = await POST(
      makeReq({ assistant_id: "a1", messages_sent: 100 }, "global-token"),
    );
    const json = await res.json();
    expect(json.throttled).toBe(true);
    expect(json.reason).toContain("limit");
  });
});

// --- /api/usage/check -------------------------------------------------

describe("GET /api/usage/check", () => {
  let routeGET: any;

  beforeEach(async () => {
    vi.resetModules();
    process.env.SIDECAR_API_TOKEN = "global-token";
    const mod = await import("@/app/api/usage/check/route");
    routeGET = mod.GET;
  });

  function makeReq(params: Record<string, string>, token?: string) {
    const url = new URL("http://localhost/api/usage/check");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const headers = new Headers();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return new Request(url.toString(), { headers }) as any;
  }

  it("returns 401 with wrong token", async () => {
    const res = await routeGET(makeReq({ assistant_id: "a1" }, "bad"));
    expect(res.status).toBe(401);
  });

  it("returns 400 without assistant_id", async () => {
    const res = await routeGET(makeReq({}, "global-token"));
    expect(res.status).toBe(400);
  });

  it("returns allowed for pro user under limit", async () => {
    vi.mocked(checkMessageLimit).mockResolvedValue({
      allowed: true,
      used: 500,
      limit: -1,
      plan: "pro",
    });

    const res = await routeGET(
      makeReq({ assistant_id: "a1" }, "global-token"),
    );
    const json = await res.json();
    expect(json.allowed).toBe(true);
    expect(json.plan).toBe("pro");
    expect(json.messageLimit).toBe(-1);
  });

  it("returns not allowed for free user at limit", async () => {
    vi.mocked(checkMessageLimit).mockResolvedValue({
      allowed: false,
      used: 50,
      limit: 50,
      plan: "free",
    });

    const res = await routeGET(
      makeReq({ assistant_id: "a1" }, "global-token"),
    );
    const json = await res.json();
    expect(json.allowed).toBe(false);
    expect(json.messagesUsed).toBe(50);
    expect(json.messageLimit).toBe(50);
  });
});
