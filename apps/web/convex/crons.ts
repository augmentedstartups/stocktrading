import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "us_eod_aapl",
  { hourUTC: 22, minuteUTC: 30 },
  internal.actions.triggerCouncil,
  { symbol: "AAPL" },
);

crons.daily(
  "jse_eod_npn",
  { hourUTC: 16, minuteUTC: 30 },
  internal.actions.triggerCouncil,
  { symbol: "NPN.JO" },
);

crons.interval(
  "intraday_qqq",
  { minutes: 15 },
  internal.actions.triggerCouncil,
  { symbol: "QQQ" },
);

export default crons;
