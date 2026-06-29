function parsePillar(text) {
  const match = text.match(/^(\[[\w]+\])\s*/);
  if (match) return { tag: match[1], body: text.slice(match[0].length) };
  return { tag: null, body: text };
}

function formatPerModel(perModel) {
  if (!Array.isArray(perModel) || perModel.length === 0) return "No per-model breakdown available.";
  const blocks = [];
  for (const m of perModel) {
    if (!m.ok) {
      blocks.push(`${m.model}\n${m.provider}\n[Error] ${m.error ?? "model failed"}`);
      continue;
    }
    const bullets =
      m.reasons?.length > 0 ? m.reasons : m.reason ? [m.reason] : [];
    const lines = [`${m.model}`, m.provider];
    for (const text of bullets) {
      const { tag, body } = parsePillar(String(text).trim());
      if (tag) lines.push(`${tag}\n${body || text}`);
      else lines.push(String(text).trim());
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

export function formatCouncilDecision(decision, meta = {}) {
  if (!decision) return "No council decision found.";
  const pct = Math.round((decision.confidence ?? 0) * 100);
  const at = meta.decisionAt ?? decision.timestamp
    ? new Date(meta.decisionAt ?? decision.timestamp).toISOString()
    : null;
  const header = [
    `${decision.symbol} — ${String(decision.action).toUpperCase()} (${pct}% confidence, horizon: ${decision.horizon ?? "?"})`,
    at ? `Decision at: ${at}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const aggregate =
    Array.isArray(decision.reasons) && decision.reasons.length > 0
      ? `\nAggregate:\n${decision.reasons.map((r) => `- ${r}`).join("\n")}`
      : "";

  return `${header}${aggregate}\n\n${formatPerModel(decision.perModel)}`;
}

export function formatHeatmap(watchlist, decisionMap) {
  const buys = [];
  const sells = [];
  const holds = [];
  const missing = [];

  for (const w of watchlist) {
    const sym = w.symbol ?? w;
    const d = decisionMap[sym];
    if (!d) {
      missing.push(sym);
      continue;
    }
    const row = {
      symbol: sym,
      action: d.action,
      confidence: d.confidence,
      horizon: d.horizon,
    };
    if (d.action === "buy") buys.push(row);
    else if (d.action === "sell") sells.push(row);
    else holds.push(row);
  }

  const sort = (a, b) => b.confidence - a.confidence;
  buys.sort(sort);
  sells.sort(sort);
  holds.sort(sort);

  const line = (r) =>
    `- ${r.symbol} — ${Math.round(r.confidence * 100)}% (${r.horizon})`;

  const sections = [];
  sections.push(`BUY (${buys.length})${buys.length ? "\n" + buys.map(line).join("\n") : "\n(none)"}`);
  sections.push(`SELL (${sells.length})${sells.length ? "\n" + sells.map(line).join("\n") : "\n(none)"}`);
  sections.push(`HOLD (${holds.length})${holds.length ? "\n" + holds.map(line).join("\n") : "\n(none)"}`);
  if (missing.length) {
    sections.push(`NO DECISION YET (${missing.length})\n${missing.map((s) => `- ${s}`).join("\n")}`);
  }
  return sections.join("\n\n");
}
