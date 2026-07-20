export type RlHorizon = "days" | "weeks" | "months";

export const RL_HORIZONS: Array<{
  id: string;
  horizon: RlHorizon;
  label: string;
  hint: string;
  color: string;
}> = [
  {
    id: "RL_days",
    horizon: "days",
    label: "RL · Days",
    hint: "RL swing-trade entries/exits (daily bars)",
    color: "#3b82f6",
  },
  {
    id: "RL_weeks",
    horizon: "weeks",
    label: "RL · Weeks",
    hint: "RL medium-term entries/exits (weekly bars)",
    color: "#a855f7",
  },
  {
    id: "RL_months",
    horizon: "months",
    label: "RL · Months",
    hint: "RL long-term entries/exits (monthly bars)",
    color: "#f59e0b",
  },
];
