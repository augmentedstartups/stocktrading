import { describe, expect, it } from "vitest";
import { searchTickers, tickerSearchHint } from "@/lib/tickerSearch";

const tickers = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "RKLB", name: "Rocket Lab USA", aliases: ["SpaceX", "Space X", "Rocket Lab"] },
  { symbol: "SPCE", name: "Virgin Galactic Holdings" },
  { symbol: "TSLA", name: "Tesla Inc." },
];

describe("searchTickers", () => {
  it("matches close company-name typos", () => {
    expect(searchTickers("aple", tickers)[0]?.symbol).toBe("AAPL");
  });

  it("finds Rocket Lab for SpaceX-style searches", () => {
    expect(searchTickers("spaceX", tickers)[0]?.symbol).toBe("RKLB");
  });

  it("still finds space tickers without aliases in the database", () => {
    const legacy = tickers.filter((t) => t.symbol !== "RKLB");
    expect(searchTickers("spaceX", legacy)[0]?.symbol).toBe("SPCE");
  });

  it("does not return raw arbitrary input as a ticker", () => {
    expect(searchTickers("notarealstock", tickers)).toEqual([]);
  });

  it("explains that SpaceX is not publicly traded", () => {
    expect(tickerSearchHint("spaceX")).toContain("not publicly traded");
  });
});
