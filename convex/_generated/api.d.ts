/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as mutations_activityEvents from "../mutations/activityEvents.js";
import type * as mutations_announcements from "../mutations/announcements.js";
import type * as mutations_offers from "../mutations/offers.js";
import type * as mutations_packages from "../mutations/packages.js";
import type * as mutations_systemState from "../mutations/systemState.js";
import type * as mutations_transfers from "../mutations/transfers.js";
import type * as queries_activities from "../queries/activities.js";
import type * as queries_announcements from "../queries/announcements.js";
import type * as queries_offers from "../queries/offers.js";
import type * as queries_packages from "../queries/packages.js";
import type * as queries_systemState from "../queries/systemState.js";
import type * as queries_transfers from "../queries/transfers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "mutations/activityEvents": typeof mutations_activityEvents;
  "mutations/announcements": typeof mutations_announcements;
  "mutations/offers": typeof mutations_offers;
  "mutations/packages": typeof mutations_packages;
  "mutations/systemState": typeof mutations_systemState;
  "mutations/transfers": typeof mutations_transfers;
  "queries/activities": typeof queries_activities;
  "queries/announcements": typeof queries_announcements;
  "queries/offers": typeof queries_offers;
  "queries/packages": typeof queries_packages;
  "queries/systemState": typeof queries_systemState;
  "queries/transfers": typeof queries_transfers;
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
