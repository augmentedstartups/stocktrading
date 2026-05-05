import { describe, expect, it } from "vitest";
import { verdictSchema } from "@/lib/llm/schema";

describe("verdictSchema", () => {
  it("accepts valid verdict", () => {
    const v = verdictSchema.parse({
      action: "buy",
      confidence: 0.72,
      horizon: "months",
      reasons: ["Momentum intact"],
    });
    expect(v.action).toBe("buy");
  });

  it("rejects empty reasons", () => {
    expect(() =>
      verdictSchema.parse({
        action: "hold",
        confidence: 0.5,
        horizon: "weeks",
        reasons: [],
      }),
    ).toThrow();
  });
});
