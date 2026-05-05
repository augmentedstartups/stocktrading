import { z } from "zod";

export const actionSchema = z.enum(["buy", "hold", "sell"]);
export const horizonSchema = z.enum(["days", "weeks", "months", "years"]);

export const verdictSchema = z.object({
  action: actionSchema,
  confidence: z.number().min(0).max(1),
  horizon: horizonSchema,
  reasons: z.array(z.string()).min(1).max(8),
});

export type Verdict = z.infer<typeof verdictSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Horizon = z.infer<typeof horizonSchema>;

export const decisionSchema = z.object({
  symbol: z.string(),
  action: actionSchema,
  confidence: z.number(),
  horizon: horizonSchema,
  reasons: z.array(z.string()),
  perModel: z.array(
    z.object({
      provider: z.string(),
      model: z.string(),
      action: actionSchema,
      confidence: z.number(),
      reason: z.string(),
      latencyMs: z.number(),
      ok: z.boolean(),
      error: z.string().optional(),
    }),
  ),
  rlInput: z
    .object({ action: actionSchema, confidence: z.number() })
    .optional(),
  snapshot: z.string().optional(),
});

export type Decision = z.infer<typeof decisionSchema>;
