import {
  addWatchlistSymbol,
  getDefaultUserId,
  listWatchlist,
  removeWatchlistSymbol,
} from "@/lib/convexServer";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  userId: z.string().optional(),
  symbol: z.string(),
});

async function resolveUserId(userId?: string) {
  return userId ?? (await getDefaultUserId());
}

export async function GET(req: Request) {
  const userId = await resolveUserId(new URL(req.url).searchParams.get("userId") ?? undefined);
  if (!userId) {
    return Response.json({ offline: true, watchlist: [] }, { status: 503 });
  }
  const watchlist = await listWatchlist(userId);
  return Response.json({ userId, watchlist });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const userId = await resolveUserId(parsed.data.userId);
  if (!userId) {
    return Response.json({ error: "Convex not configured" }, { status: 503 });
  }
  const id = await addWatchlistSymbol(userId, parsed.data.symbol.trim().toUpperCase());
  const watchlist = await listWatchlist(userId);
  return Response.json({ userId, id, watchlist });
}

export async function DELETE(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const userId = await resolveUserId(parsed.data.userId);
  if (!userId) {
    return Response.json({ error: "Convex not configured" }, { status: 503 });
  }
  await removeWatchlistSymbol(userId, parsed.data.symbol.trim().toUpperCase());
  const watchlist = await listWatchlist(userId);
  return Response.json({ userId, watchlist });
}
