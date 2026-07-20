import { mlPost } from "@/lib/ml";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  symbol: z.string().min(1),
  horizon: z.enum(["days", "weeks", "months"]).optional(),
  timesteps: z.number().int().min(1000).max(500_000).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbol, horizon = "days", timesteps = 30_000 } = parsed.data;
  try {
    const result = await mlPost<Record<string, unknown>>(
      `/rl/train?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}&timesteps=${timesteps}`,
    );
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
