/**
 * Loads the signed-in user's profile from GET /auth/me.
 *
 * A 401 means the session is invalid/expired — `apiFetch` calls
 * `handleUnauthorized`, which clears the local session; the (tabs) layout then
 * redirects to login. Network/5xx surface as a retryable error.
 */
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { getTokens } from "@/lib/session";

export type Profile = {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
};

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useProfile(): UseProfileResult {
  const { handleUnauthorized } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tokens = await getTokens();
      if (!tokens) {
        // Not signed in — the layout will redirect; nothing to show.
        setProfile(null);
        return;
      }

      const res = await apiFetch(
        "/auth/me",
        { method: "GET", accessToken: tokens.accessToken },
        handleUnauthorized,
      );

      if (res.status === 401) {
        // Session cleared by handleUnauthorized; redirect handled by layout.
        return;
      }
      if (!res.ok) {
        setError("Couldn't load your profile. Pull to retry.");
        return;
      }

      setProfile((await res.json()) as Profile);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, loading, error, reload: load };
}
