import { getDefaultUserId, getSettings, updateSettings } from "@/lib/convexServer";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  userId: z.string().optional(),
  markets: z.array(z.enum(["US", "JSE", "INDEX"])).optional(),
  categories: z.array(z.string()).optional(),
  frequency: z.enum(["eod", "15min", "realtime"]).optional(),
  risk: z.enum(["conservative", "balanced", "aggressive"]).optional(),
  horizon: z.enum(["days", "weeks", "months", "years"]).optional(),
  activeProviders: z.array(z.string()).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  indicators: z.array(z.string()).optional(),
});

async function resolveUserId(userId?: string) {
  return userId ?? (await getDefaultUserId());
}

export async function GET(req: Request) {
  const userId = await resolveUserId(new URL(req.url).searchParams.get("userId") ?? undefined);
  if (!userId) {
    return Response.json({ offline: true }, { status: 503 });
  }
  const settings = await getSettings(userId);
  return Response.json({ userId, settings });
}

export async function PATCH(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId: bodyUserId, ...patch } = parsed.data;
  const userId = await resolveUserId(bodyUserId);
  if (!userId) {
    return Response.json({ error: "Convex not configured" }, { status: 503 });
  }
  const settings = await updateSettings(userId, patch);
  return Response.json({ userId, settings });
}
