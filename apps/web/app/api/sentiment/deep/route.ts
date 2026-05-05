import { llmDeepSchema, mergeSentiment } from "@/lib/llm/sentiment";
import { mlGet } from "@/lib/ml";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
});

function extractJson(raw: string): unknown {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbol, name } = parsed.data;

  const sentMl = await mlGet<{
    aggregate: { score: number; pos: number; neu: number; neg: number; n_articles: number };
    articles: Array<{ title: string; url: string; summary?: string }>;
  }>(
    `/sentiment?symbol=${encodeURIComponent(symbol)}${name ? `&name=${encodeURIComponent(name)}` : ""}`,
  );

  const headlines = sentMl.articles
    .slice(0, 12)
    .map((a) => `- ${a.title}`)
    .join("\n");
  const sys = `You analyze financial news for ticker ${symbol}. Output ONLY JSON matching:
{"sentiment":"bullish"|"neutral"|"bearish","magnitude":0..1,"horizon":"days"|"weeks"|"months"|"quarters","rationale":"string","keyPhrases":["string"],"citedHeadlines":[{"title":"string","url":"string","impact":0..1}]}
Use citedHeadlines only from the provided article list when possible.`;

  const user = `Headlines:\n${headlines}\n\nArticles metadata:\n${JSON.stringify(sentMl.articles.slice(0, 8))}`;

  let llm = null;
  const gKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (gKey) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: gKey });
      const model =
        process.env.GEMINI_FLASH_LITE_MODEL ?? "gemini-3.1-flash-lite-preview";
      const { text } = await generateText({
        model: google(model),
        system: sys,
        prompt: user,
        temperature: 0.15,
      });
      llm = llmDeepSchema.parse(extractJson(text));
    } catch {
      llm = null;
    }
  }

  if (!llm) {
    const key = process.env.DEEPSEEK_API_KEY;
    if (key) {
      try {
        const client = createOpenAI({
          apiKey: key,
          baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
        });
        const { text } = await generateText({
          model: client(process.env.DEEPSEEK_MODEL ?? "deepseek-chat"),
          system: sys,
          prompt: user,
          temperature: 0.15,
        });
        llm = llmDeepSchema.parse(extractJson(text));
      } catch {
        llm = null;
      }
    }
  }

  const snapshot = mergeSentiment(
    symbol,
    {
      score: sentMl.aggregate.score,
      pos: sentMl.aggregate.pos,
      neu: sentMl.aggregate.neu,
      neg: sentMl.aggregate.neg,
      n_articles: sentMl.aggregate.n_articles,
    },
    llm,
  );

  return Response.json({ snapshot, articles: sentMl.articles });
}
