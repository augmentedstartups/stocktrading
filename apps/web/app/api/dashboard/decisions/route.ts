import { getDefaultUserId, listDecisions } from "@/lib/convexServer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") ?? undefined;
  const userId = (url.searchParams.get("userId") ?? (await getDefaultUserId())) ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const decisions = await listDecisions(userId, symbol, Number.isFinite(limit) ? limit : 50);
  return Response.json({ userId, symbol, decisions });
}
