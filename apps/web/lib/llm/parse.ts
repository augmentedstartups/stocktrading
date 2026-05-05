import { verdictSchema, type Verdict } from "./schema";

export function parseVerdictJson(raw: string): Verdict {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const parsed = JSON.parse(s) as unknown;
  return verdictSchema.parse(parsed);
}
