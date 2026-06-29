const CONTROL_URL = process.env.CONTROL_URL ?? "http://127.0.0.1:54827";

export async function control(path, init = {}) {
  const res = await fetch(`${CONTROL_URL}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body?.error
        ? String(body.error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export function q(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function textResult(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function post(path, body) {
  return control(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patch(path, body) {
  return control(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function resolveActiveProviders(userId, activeProviders) {
  if (Array.isArray(activeProviders) && activeProviders.length > 0) {
    return activeProviders;
  }
  const settings = await control(`/dashboard/settings${q({ userId })}`);
  const saved = settings?.settings?.activeProviders;
  if (Array.isArray(saved) && saved.length > 0) return saved;
  const models = await control("/council/models");
  const first = models?.models?.[0]?.id;
  return first ? [first] : [];
}

export async function latestDecision(userId, symbol) {
  const out = await control(
    `/dashboard/decisions${q({ userId, symbol, limit: 1 })}`
  );
  return out?.decisions?.[0] ?? null;
}

export async function watchlistDecisions(userId) {
  const wl = await control(`/dashboard/watchlist${q({ userId })}`);
  const symbols = (wl?.watchlist ?? []).map((w) => w.symbol);
  const map = {};
  for (const symbol of symbols) {
    map[symbol] = await latestDecision(userId, symbol);
  }
  return { watchlist: wl?.watchlist ?? [], decisions: map };
}
