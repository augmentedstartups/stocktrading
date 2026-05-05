import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const requiredKeys = [
  "rsi",
  "macd",
  "macdSignal",
  "macdHist",
  "ma20",
  "ma50",
  "ma200",
  "bbUpper",
  "bbMiddle",
  "bbLower",
  "atr",
  "obv",
  "vwap",
  "close",
  "date",
] as const;

describe("indicators snapshot fixture", () => {
  it("matches ML latest_snapshot shape", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(path.join(dir, "../fixtures/indicators_snapshot.json"), "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    for (const k of requiredKeys) {
      expect(data).toHaveProperty(k);
    }
    expect(typeof data.date).toBe("string");
  });
});
