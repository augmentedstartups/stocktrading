/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as backtests from "../backtests.js";
import type * as crons from "../crons.js";
import type * as decisions from "../decisions.js";
import type * as init from "../init.js";
import type * as modelPerformance from "../modelPerformance.js";
import type * as news from "../news.js";
import type * as settings from "../settings.js";
import type * as signals from "../signals.js";
import type * as tickerPresets from "../tickerPresets.js";
import type * as tickers from "../tickers.js";
import type * as users from "../users.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  backtests: typeof backtests;
  crons: typeof crons;
  decisions: typeof decisions;
  init: typeof init;
  modelPerformance: typeof modelPerformance;
  news: typeof news;
  settings: typeof settings;
  signals: typeof signals;
  tickerPresets: typeof tickerPresets;
  tickers: typeof tickers;
  users: typeof users;
  watchlist: typeof watchlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
