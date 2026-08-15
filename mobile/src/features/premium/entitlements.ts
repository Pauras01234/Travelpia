/**
 * The catalogue of premium capabilities.
 *
 * Adding a premium feature is one entry here plus a `useFeatureGate` call at
 * the point of use — no new context, no new modal, no new copy scattered
 * through screens. Limits mirror the server's defaults for display only; the
 * server is always the authority (see backend/app/domain/plans.py).
 */
import type { Ionicons } from "@expo/vector-icons";

import type { Plan } from "@/lib/api";

export type IoniconName = keyof typeof Ionicons.glyphMap;

export type PremiumFeatureKey =
  | "unlimitedAsks"
  | "detailedMode"
  | "profilePhoto";

export interface PremiumFeature {
  /** Shown as the upgrade sheet's headline. */
  title: string;
  /** One line explaining what the user gets. */
  blurb: string;
  icon: IoniconName;
  /** True when the free plan already includes it. */
  includedInFree?: boolean;
}

export const PREMIUM_FEATURES: Record<PremiumFeatureKey, PremiumFeature> = {
  unlimitedAsks: {
    title: "Ask as much as you like",
    blurb:
      "Free accounts get a few questions a day. Premium lifts the limit so you can plan a whole trip in one sitting.",
    icon: "chatbubble-ellipses-outline",
  },
  detailedMode: {
    title: "Detailed answers",
    blurb:
      "Longer, richer answers with more specific places, tips and sources — instead of a quick summary.",
    icon: "sparkles-outline",
  },
  profilePhoto: {
    title: "Your own profile photo",
    blurb: "Replace your initials with a picture of your choosing.",
    icon: "camera-outline",
  },
};

/** Whether a plan includes a given capability. */
export function planIncludes(plan: Plan, key: PremiumFeatureKey): boolean {
  return plan === "premium" || PREMIUM_FEATURES[key].includedInFree === true;
}

/**
 * The reset moment in the reader's own wall-clock time, e.g. "at 01:00".
 * The server works in UTC; showing that raw would be confusing.
 */
export function formatResetTime(isoTimestamp: string | null): string | null {
  if (!isoTimestamp) return null;
  const when = new Date(isoTimestamp);
  if (Number.isNaN(when.getTime())) return null;
  const hh = String(when.getHours()).padStart(2, "0");
  const mm = String(when.getMinutes()).padStart(2, "0");
  return `at ${hh}:${mm}`;
}
