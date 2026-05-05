import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { axeMinJsPath, loadPlaywright, repoRoot } from "./pw_resolve";

const ML = process.env.ML_BASE ?? "http://127.0.0.1:8000";
const WEB = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000";

type Step = { name: string; ok: boolean; detail?: string };

async function main() {
  const steps: Step[] = [];

  async function step(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      steps.push({ name, ok: true });
    } catch (e) {
      steps.push({
        name,
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await step("ml_health", async () => {
    const r = await fetch(`${ML}/health`);
    if (!r.ok) throw new Error(String(r.status));
  });

  await step("ml_prices_aapl", async () => {
    const r = await fetch(`${ML}/prices?symbol=AAPL&period=5y`);
    const j = (await r.json()) as { rows?: number };
    if (!r.ok) throw new Error(String(r.status));
    if ((j.rows ?? 0) < 500) throw new Error(`too few rows ${j.rows}`);
  });

  await step("ml_indicators_aapl", async () => {
    const r = await fetch(`${ML}/indicators?symbol=AAPL`);
    const j = (await r.json()) as { snapshot?: { rsi?: number } };
    if (!r.ok) throw new Error(String(r.status));
    const rsi = j.snapshot?.rsi;
    if (rsi === undefined || rsi < 0 || rsi > 100) throw new Error(`bad rsi ${rsi}`);
  });

  await step("ml_sentiment_aapl", async () => {
    const r = await fetch(`${ML}/sentiment?symbol=AAPL`);
    const j = (await r.json()) as { articles?: unknown[] };
    if (!r.ok) throw new Error(String(r.status));
    if ((j.articles?.length ?? 0) < 1) throw new Error("no articles");
  });

  await step("ml_rl_predict_aapl", async () => {
    const r = await fetch(`${ML}/rl/predict?symbol=AAPL`);
    const j = (await r.json()) as { action?: string; confidence?: number };
    if (!r.ok) throw new Error(String(r.status));
    if (!["buy", "hold", "sell"].includes(j.action ?? "")) throw new Error("bad action");
    if (j.confidence === undefined || j.confidence < 0 || j.confidence > 1) {
      throw new Error("bad confidence");
    }
  });

  await step("ml_backtest_aapl", async () => {
    const r = await fetch(`${ML}/backtest?symbol=AAPL&strategy=buyhold`);
    const j = (await r.json()) as { sharpe?: number; maxDrawdown?: number };
    if (!r.ok) throw new Error(String(r.status));
    if (j.sharpe === undefined || j.maxDrawdown === undefined) throw new Error("missing metrics");
  });

  await step("ml_prices_npn_jo", async () => {
    const r = await fetch(`${ML}/prices?symbol=NPN.JO&period=5y`);
    const j = (await r.json()) as { rows?: number };
    if (!r.ok) throw new Error(String(r.status));
    if ((j.rows ?? 0) < 20) throw new Error(`too few rows ${j.rows}`);
  });

  await step("ml_indicators_npn_jo", async () => {
    const r = await fetch(`${ML}/indicators?symbol=NPN.JO`);
    const j = (await r.json()) as { snapshot?: { rsi?: number } };
    if (!r.ok) throw new Error(String(r.status));
    const rsi = j.snapshot?.rsi;
    if (rsi === undefined || rsi < 0 || rsi > 100) throw new Error(`bad rsi ${rsi}`);
  });

  await step("ml_sentiment_npn_jo", async () => {
    const r = await fetch(`${ML}/sentiment?symbol=NPN.JO`);
    const j = (await r.json()) as { aggregate?: { score?: number }; articles?: unknown[] };
    if (!r.ok) throw new Error(String(r.status));
    if (j.aggregate?.score === undefined) throw new Error("no aggregate");
  });

  await step("web_council_aapl", async () => {
    const r = await fetch(`${WEB}/api/council`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "AAPL", persist: false }),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const j = (await r.json()) as { decision?: { action?: string } };
    if (!j.decision?.action) throw new Error("no decision");
  });

  await step("ui_playwright_screenshots_and_rail", async () => {
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const outDir = path.join(repoRoot(), "tests", "e2e");
    mkdirSync(outDir, { recursive: true });

    await page.goto(`${WEB}/?e2eOffline=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await new Promise((r) => setTimeout(r, 2500));
    const search = await page.evaluate(() => window.location.search);
    if (!search.includes("e2eOffline")) {
      throw new Error(`offline query missing: ${search}`);
    }
    if ((await page.locator('[aria-label="Ticker symbol"]').count()) < 1) {
      throw new Error("offline dashboard ticker input not found");
    }

    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    if (isDark) {
      await page.getByRole("button", { name: /Switch to light mode/i }).click();
      await new Promise((r) => setTimeout(r, 600));
    }
    await page.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: true });

    const axePath = axeMinJsPath();
    await page.addScriptTag({ path: axePath });
    type AxeWin = {
      axe?: { run: () => Promise<{ violations: { impact?: string; id: string }[] }> };
    };
    const axeRes = await page.evaluate(async () => {
      const w = window as unknown as AxeWin;
      if (!w.axe?.run) throw new Error("axe not loaded");
      return w.axe.run({
        rules: { "color-contrast": { enabled: false } },
      });
    });
    const serious = axeRes.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    if (serious.length > 0) {
      throw new Error(
        `axe serious violations: ${serious.map((v) => v.id).join(",")}`,
      );
    }

    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(outDir, "dashboard-dark.png"),
      fullPage: true,
    });

    await page.waitForSelector('[data-testid="indicator-rail-RSI"]:not([disabled])', {
      timeout: 120000,
    });
    const rsi = page.locator('[data-testid="indicator-rail-RSI"]');
    await rsi.scrollIntoViewIfNeeded();
    await rsi.click({ trial: true });
    await rsi.click();
    await new Promise((r) => setTimeout(r, 400));

    await browser.close();
  });

  const allOk = steps.every((s) => s.ok);

  mkdirSync(path.join(repoRoot(), "tests", "e2e"), { recursive: true });
  writeFileSync(
    path.join(repoRoot(), "tests", "e2e", "last_run.json"),
    JSON.stringify({ at: Date.now(), ML, WEB, steps }, null, 2),
  );

  if (!allOk) {
    console.error(JSON.stringify(steps, null, 2));
    process.exit(1);
  }

  console.log("E2E PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
