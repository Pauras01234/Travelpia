/**
 * The signed-in user's profile, fetched once and shared.
 *
 * Home, Profile, Settings and the premium gate all need the same record.
 * Fetching per screen meant four round trips (and four Supabase lookups) on
 * every tab switch, so the request lives here and screens read from context.
 *
 * Auth is handled by `@/api/client`: it attaches (and refreshes) the session
 * token, and on a 401 it clears the session — the (tabs) layout then redirects
 * to login. Network/5xx surface here as a retryable error.
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

import { ApiError, apiFetch } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Plan } from "@/lib/api";

export type Profile = {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  /** Absent on older backends; callers treat a missing plan as "free". */
  plan?: Plan;
};

export interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ProfileContext = createContext<UseProfileResult | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isReady, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Note: we don't force `loading` true here, so re-fetches (retry / focus
    // refresh) update the data silently — only the first load shows a spinner.
    setError(null);
    try {
      setProfile(await apiFetch<Profile>("/auth/me"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session already cleared by the client; the layout handles the rest.
        return;
      }
      setError(
        err instanceof ApiError && err.isRetryable
          ? "Couldn't reach the server. Check your connection."
          : "Couldn't load your profile. Pull to retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for the persisted session to be read before asking who we are —
    // this also guarantees AuthProvider has registered the token bridge.
    if (!isReady) return;
    if (!isSignedIn) {
      setProfile(null);
      setLoading(false);
      return;
    }
    void load();
  }, [isReady, isSignedIn, load]);

  const value = useMemo<UseProfileResult>(
    () => ({ profile, loading, error, reload: load }),
    [profile, loading, error, load],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): UseProfileResult {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
