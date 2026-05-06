import { mlGet } from "@/lib/ml";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  query: z.string(),
  symbol: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { query, symbol } = parsed.data;

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return Response.json({ error: "DEEPSEEK_API_KEY missing" }, { status: 500 });
  }
  const client = createOpenAI({
    apiKey: key,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
  });
  const model = client(process.env.RESEARCH_MODEL ?? "deepseek-chat");

  const tools = {
    tavily_search: tool({
      description: "Search recent web/news via Tavily.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query: q }) => {
        const k = process.env.TAVILY_API_KEY;
        if (!k) return { error: "no TAVILY_API_KEY" };
        const r = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: k,
            query: q,
            topic: "news",
            max_results: 8,
            search_depth: "basic",
          }),
        });
        const data = await r.json();
        return data;
      },
    }),
    exa_search: tool({
      description: "Semantic web search via Exa.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query: q }) => {
        const k = process.env.EXA_API_KEY;
        if (!k) return { error: "no EXA_API_KEY" };
        const r = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": k },
          body: JSON.stringify({
            query: q,
            type: "auto",
            numResults: 8,
            contents: { text: true },
          }),
        });
        return r.json();
      },
    }),
    firecrawl_scrape: tool({
      description: "Fetch clean markdown from a URL via Firecrawl.",
      inputSchema: z.object({ url: z.string().url() }),
      execute: async ({ url }) => {
        const k = process.env.FIRECRAWL_API_KEY;
        if (!k) return { error: "no FIRECRAWL_API_KEY" };
        const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${k}`,
          },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });
        return r.json();
      },
    }),
    serp_news: tool({
      description: "Google News via SerpAPI.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query: q }) => {
        const k = process.env.SERPAPI_API_KEY;
        if (!k) return { error: "no SERPAPI_API_KEY" };
        const u = new URL("https://serpapi.com/search.json");
        u.searchParams.set("engine", "google_news");
        u.searchParams.set("q", q);
        u.searchParams.set("api_key", k);
        const r = await fetch(u.toString());
        return r.json();
      },
    }),
    get_indicators: tool({
      description: "Latest indicator snapshot from local ML service.",
      inputSchema: z.object({ symbol: z.string() }),
      execute: async ({ symbol: sym }) =>
        mlGet(`/indicators?symbol=${encodeURIComponent(sym)}`),
    }),
    get_sentiment: tool({
      description: "News + FinBERT sentiment bundle from ML service.",
      inputSchema: z.object({ symbol: z.string() }),
      execute: async ({ symbol: sym }) =>
        mlGet(`/sentiment?symbol=${encodeURIComponent(sym)}`),
    }),
    get_rl: tool({
      description: "RL policy prediction from ML service.",
      inputSchema: z.object({ symbol: z.string() }),
      execute: async ({ symbol: sym }) =>
        mlGet(`/rl/predict?symbol=${encodeURIComponent(sym)}`),
    }),
  };

  const symLine = symbol ? `Primary symbol context: ${symbol}.` : "";

  const { text, steps } = await generateText({
    model,
    stopWhen: stepCountIs(8),
    tools,
    system: `You are an autonomous equity research agent. ${symLine}
Use tools when fresh facts are needed. When finished, write a concise memo with sections: Summary, Key facts, Risks, Action bias (buy/hold/sell) with uncertainty.`,
    prompt: query,
    temperature: 0.2,
  });

  return Response.json({ text, steps: steps?.length ?? 0 });
}
