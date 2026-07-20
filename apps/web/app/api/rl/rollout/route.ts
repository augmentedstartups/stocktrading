import { mlGet } from "@/lib/ml";

export const runtime = "nodejs";

export type RlMarker = { t: number; price: number; action: "buy" | "sell" };
export type RlRolloutResponse = {
  trained: boolean;
  markers: RlMarker[];
  current: { action: string; confidence: number } | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const horizon = searchParams.get("horizon") ?? "days";
  if (!symbol) {
    return Response.json({ error: "symbol required" }, { status: 400 });
  }
  try {
    const result = await mlGet<RlRolloutResponse>(
      `/rl/rollout?symbol=${encodeURIComponent(symbol)}&horizon=${encodeURIComponent(horizon)}`,
    );
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
