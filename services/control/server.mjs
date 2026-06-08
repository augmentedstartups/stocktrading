import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.CONTROL_PORT ?? 54827);
const WEB_URL = process.env.WEB_URL ?? "http://127.0.0.1:53947";
const ML_URL = process.env.ML_URL ?? "http://127.0.0.1:58123";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

async function proxy(base, path, init) {
  const r = await fetch(`${base}${path}`, init);
  const text = await r.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: r.status, body, contentType: r.headers.get("content-type") ?? "application/json" };
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });
}

const routes = [
  { method: "GET", path: "/health", handler: async () => ({
    status: "ok",
    service: "stockanalysis-control",
    port: PORT,
    web: WEB_URL,
    ml: ML_URL,
  })},
  { method: "GET", path: "/spec", handler: async () => {
    const yaml = readFileSync(join(ROOT, "stockanalysis.yaml"), "utf8");
    return { yaml };
  }},
  { method: "GET", path: "/council/models", upstream: "web", target: "/api/council/models" },
  { method: "POST", path: "/council", upstream: "web", target: "/api/council" },
  { method: "POST", path: "/council/batch", upstream: "web", target: "/api/council/batch" },
  { method: "POST", path: "/research", upstream: "web", target: "/api/research" },
  { method: "POST", path: "/sentiment/deep", upstream: "web", target: "/api/sentiment/deep" },
  { method: "POST", path: "/dashboard/bootstrap", upstream: "web", target: "/api/dashboard/bootstrap" },
  { method: "GET", path: "/dashboard/watchlist", upstream: "web", target: "/api/dashboard/watchlist" },
  { method: "POST", path: "/dashboard/watchlist", upstream: "web", target: "/api/dashboard/watchlist" },
  { method: "DELETE", path: "/dashboard/watchlist", upstream: "web", target: "/api/dashboard/watchlist" },
  { method: "GET", path: "/dashboard/settings", upstream: "web", target: "/api/dashboard/settings" },
  { method: "PATCH", path: "/dashboard/settings", upstream: "web", target: "/api/dashboard/settings" },
  { method: "GET", path: "/dashboard/decisions", upstream: "web", target: "/api/dashboard/decisions" },
  { method: "GET", path: "/prices", upstream: "ml", target: "/prices" },
  { method: "POST", path: "/prices/refresh", upstream: "ml", target: "/prices", methodOverride: "POST" },
  { method: "GET", path: "/indicators", upstream: "ml", target: "/indicators" },
  { method: "GET", path: "/fundamentals", upstream: "ml", target: "/fundamentals" },
  { method: "GET", path: "/sentiment", upstream: "ml", target: "/sentiment" },
  { method: "GET", path: "/rl/predict", upstream: "ml", target: "/rl/predict" },
  { method: "POST", path: "/rl/train", upstream: "ml", target: "/rl/train" },
  { method: "GET", path: "/backtest", upstream: "ml", target: "/backtest" },
  { method: "POST", path: "/backtest", upstream: "ml", target: "/backtest" },
];

createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const route = routes.find((r) => r.method === req.method && r.path === url.pathname);

  if (!route) {
    json(res, 404, { error: "not_found", path: url.pathname });
    return;
  }

  try {
    if (route.handler) {
      json(res, 200, await route.handler());
      return;
    }

    const base = route.upstream === "ml" ? ML_URL : WEB_URL;
    const query = url.search || "";
    const target = `${route.target}${query}`;
    const body = ["POST", "PATCH", "DELETE"].includes(req.method) ? await readBody(req) : undefined;
    const init = {
      method: route.methodOverride ?? req.method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    };
    const out = await proxy(base, target, init);
    json(res, out.status, out.body);
  } catch (e) {
    json(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Stock Analysis Control API → http://127.0.0.1:${PORT}`);
  console.log(`  Web proxy  ${WEB_URL}`);
  console.log(`  ML proxy   ${ML_URL}`);
});
