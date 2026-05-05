import { mkdirSync } from "node:fs";
import path from "node:path";
import { axeMinJsPath, loadPlaywright, repoRoot } from "./pw_resolve";

const WEB = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000";

async function main() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const axePath = axeMinJsPath();

  const runAxe = async (route: string) => {
    await page.goto(`${WEB}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.addScriptTag({ path: axePath });
    type AxeWin = {
      axe?: { run: () => Promise<{ violations: { impact?: string }[] }> };
    };
    const res = await page.evaluate(async () => {
      const w = window as unknown as AxeWin;
      if (!w.axe?.run) throw new Error("axe not loaded");
      return w.axe.run({
        rules: { "color-contrast": { enabled: false } },
      });
    });
    const serious = res.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    return { route, violations: res.violations.length, serious: serious.length };
  };

  const home = await runAxe("/");
  const settings = await runAxe("/settings");
  await browser.close();

  mkdirSync(path.join(repoRoot(), "tests", "e2e"), { recursive: true });
  const summary = { at: Date.now(), WEB, pages: [home, settings] };
  console.log(JSON.stringify(summary, null, 2));

  if (home.serious > 0 || settings.serious > 0) {
    console.error("DESIGN AUDIT FAIL: serious/critical axe violations");
    process.exit(1);
  }
  console.log("DESIGN AUDIT PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
