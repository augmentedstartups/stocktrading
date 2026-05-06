import { listCouncilModels } from "@/lib/llm/council";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ models: listCouncilModels() });
}
