import {
  bootstrapDashboard,
  getDefaultUserId,
} from "@/lib/convexServer";

export const runtime = "nodejs";

export async function POST() {
  const boot = await bootstrapDashboard();
  if ("offline" in boot) {
    return Response.json({ offline: true, message: "Convex not configured" }, { status: 503 });
  }
  const userId = boot.userId ?? (await getDefaultUserId());
  return Response.json({ userId, bootstrapped: true });
}
