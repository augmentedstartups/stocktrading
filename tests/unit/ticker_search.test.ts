import { describe, expect, it } from "vitest";
import { searchTickers } from "@/lib/tickerSearch";

const tickers = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  {
    symbol: "SPCX",
    name: "Space Exploration Technologies Corp.",
    aliases: ["SpaceX", "Space X", "Space Exploration Technologies"],
  },
  { symbol: "RKLB", name: "Rocket Lab USA", aliases: ["Rocket Lab"] },
  { symbol: "SPCE", name: "Virgin Galactic Holdings" },
  { symbol: "TSLA", name: "Tesla Inc." },
];

describe("searchTickers", () => {
  it("matches close company-name typos", () => {
    expect(searchTickers("aple", tickers)[0]?.symbol).toBe("AAPL");
  });

  it("finds SpaceX IPO ticker for spaceX searches", () => {
    expect(searchTickers("spaceX", tickers)[0]?.symbol).toBe("SPCX");
  });

  it("finds SPCX by ticker symbol", () => {
    expect(searchTickers("spcx", tickers)[0]?.symbol).toBe("SPCX");
  });

  it("does not return raw arbitrary input as a ticker", () => {
    expect(searchTickers("notarealstock", tickers)).toEqual([]);
  });
});
