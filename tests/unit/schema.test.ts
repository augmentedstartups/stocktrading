import { describe, expect, it } from "vitest";
import { parseVerdictJson } from "@/lib/llm/parse";

describe("parseVerdictJson", () => {
  it("parses bare JSON", () => {
    const v = parseVerdictJson(
      '{"action":"hold","confidence":0.55,"horizon":"months","reasons":["Mixed momentum"]}',
    );
    expect(v.action).toBe("hold");
    expect(v.confidence).toBeCloseTo(0.55);
  });

  it("strips fences", () => {
    const v = parseVerdictJson(
      '```json\n{"action":"buy","confidence":0.61,"horizon":"years","reasons":["Trend intact"]}\n```',
    );
    expect(v.action).toBe("buy");
  });
});
