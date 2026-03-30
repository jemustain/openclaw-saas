import { describe, it, expect } from "vitest";

describe("webhook idempotency", () => {
  const MAX = 10_000;
  function store() {
    const s = new Set<string>();
    function mark(id: string) { if (s.has(id)) return false; if (s.size >= MAX) { const f = s.values().next().value; if (f) s.delete(f); } s.add(id); return true; }
    return { s, mark };
  }

  it("accepts new", () => { expect(store().mark("e1")).toBe(true); });
  it("rejects dup", () => { const st = store(); st.mark("e2"); expect(st.mark("e2")).toBe(false); });
  it("evicts oldest", () => {
    const { s, mark } = store();
    for (let i = 0; i < MAX; i++) mark("e_"+i);
    mark("new");
    expect(s.has("e_0")).toBe(false);
    expect(s.has("new")).toBe(true);
  });
});
