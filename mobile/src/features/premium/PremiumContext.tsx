/**
 * Plan state, the daily Ask allowance, and the upgrade sheet.
 *
 * The server is the authority on both: the plan arrives with the profile, and
 * the remaining allowance is echoed on every answer. Nothing is counted
 * locally — the client only displays what the last response reported, so it
 * self-corrects across devices, day rollovers and plan changes.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "@/api/client";
import { ApiErrorCode, type QuotaState } from "@/api/types";
import { useProfile } from "@/features/profile/ProfileContext";
import type { Plan } from "@/lib/api";

import {
  formatResetTime,
  PREMIUM_FEATURES,
  planIncludes,
  type PremiumFeatureKey,
} from "./entitlements";
import { PremiumSheet } from "./PremiumSheet";

interface PremiumContextValue {
  plan: Plan;
  isPremium: boolean;
  /** Null when metering is off, or before the first answer of the session. */
  quota: QuotaState | null;
  /** True once the allowance is known to be used up. */
  outOfQuestions: boolean;
  hasFeature: (feature: PremiumFeatureKey) => boolean;
  /** Opens the upgrade sheet for a feature. */
  requestAccess: (feature: PremiumFeatureKey) => void;
  /** Record the quota the server reported alongside an answer. */
  reportQuota: (quota: QuotaState | null | undefined) => void;
  /**
   * Handles the entitlement errors centrally. Returns true when the error was
   * consumed (the sheet is now showing) so callers can skip their error UI.
   */
  handleApiError: (error: unknown) => boolean;
}

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

/** Reads a quota snapshot out of a 429's `meta` envelope. */
function quotaFromMeta(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return null;
  const { plan, limit, remaining, resets_at: resetsAt } = meta;
  if (typeof limit !== "number" || typeof remaining !== "number") return null;
  return {
    plan: plan === "premium" ? "premium" : "free",
    limit,
    remaining,
    resets_at: typeof resetsAt === "string" ? resetsAt : "",
  } satisfies QuotaState;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [openFeature, setOpenFeature] = useState<PremiumFeatureKey | null>(null);

  const plan: Plan = profile?.plan === "premium" ? "premium" : "free";

  // A plan change invalidates any allowance we're holding; the next answer
  // reports the new one. Prevents showing "0 left" straight after upgrading.
  useEffect(() => {
    setQuota(null);
  }, [plan]);

  const reportQuota = useCallback(
    (next: QuotaState | null | undefined) => setQuota(next ?? null),
    [],
  );

  const requestAccess = useCallback(
    (feature: PremiumFeatureKey) => setOpenFeature(feature),
    [],
  );

  const hasFeature = useCallback(
    (feature: PremiumFeatureKey) => planIncludes(plan, feature),
    [plan],
  );

  const handleApiError = useCallback((error: unknown): boolean => {
    if (!(error instanceof ApiError)) return false;

    if (error.code === ApiErrorCode.quotaExceeded) {
      const fromMeta = quotaFromMeta(error.meta);
      if (fromMeta) setQuota(fromMeta);
      setOpenFeature("unlimitedAsks");
      return true;
    }

    if (error.code === ApiErrorCode.premiumRequired) {
      // The server names the capability, so new gates need no client change.
      const feature = error.meta?.feature;
      setOpenFeature(
        feature === "detailed_mode" ? "detailedMode" : "unlimitedAsks",
      );
      return true;
    }

    return false;
  }, []);

  const value = useMemo<PremiumContextValue>(
    () => ({
      plan,
      isPremium: plan === "premium",
      quota,
      outOfQuestions: quota !== null && quota.remaining <= 0,
      hasFeature,
      requestAccess,
      reportQuota,
      handleApiError,
    }),
    [plan, quota, hasFeature, requestAccess, reportQuota, handleApiError],
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      {/* Hosted here so any screen can open it without owning a modal. */}
      <PremiumSheet
        feature={openFeature}
        resetsAt={
          openFeature === "unlimitedAsks"
            ? formatResetTime(quota?.resets_at ?? null)
            : null
        }
        onClose={() => setOpenFeature(null)}
      />
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return ctx;
}

/** Gate a single capability at its point of use. */
export function useFeatureGate(feature: PremiumFeatureKey): {
  allowed: boolean;
  requestAccess: () => void;
  title: string;
} {
  const { hasFeature, requestAccess } = usePremium();
  return {
    allowed: hasFeature(feature),
    requestAccess: () => requestAccess(feature),
    title: PREMIUM_FEATURES[feature].title,
  };
}
