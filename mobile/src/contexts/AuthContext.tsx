import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { logoutRequest } from "@/lib/api";
import { setAuthBridge } from "@/lib/authBridge";
import {
  clearTokens,
  getTokens,
  getValidAccessToken,
  setTokens,
} from "@/lib/session";

type AuthContextValue = {
  isReady: boolean;
  isSignedIn: boolean;
  completeLogin: (
    accessToken: string,
    refreshToken: string,
    expiresInSeconds?: number,
  ) => Promise<void>;
  logout: () => Promise<void>;
  /** Clear local session (e.g. expired access token on a later request). */
  handleUnauthorized: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tokens = await getTokens();
        if (!cancelled) {
          setIsSignedIn(tokens !== null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const completeLogin = useCallback(
    async (
      accessToken: string,
      refreshToken: string,
      expiresInSeconds?: number,
    ) => {
      await setTokens(accessToken, refreshToken, expiresInSeconds);
      setIsSignedIn(true);
    },
    [],
  );

  const handleUnauthorized = useCallback(async () => {
    await clearTokens();
    setIsSignedIn(false);
  }, []);

  // Let the HTTP client authenticate requests and report rejected sessions
  // without any feature code having to pass tokens around.
  useEffect(() => {
    setAuthBridge({
      getAccessToken: getValidAccessToken,
      onUnauthorized: handleUnauthorized,
    });
    return () => setAuthBridge(null);
  }, [handleUnauthorized]);

  const logout = useCallback(async () => {
    const tokens = await getTokens();

    if (tokens) {
      try {
        await logoutRequest(tokens.accessToken, tokens.refreshToken);
      } catch (error) {
        console.warn("Logout request failed; clearing local session anyway.", error);
      }
    }

    await clearTokens();
    setIsSignedIn(false);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      isSignedIn,
      completeLogin,
      logout,
      handleUnauthorized,
    }),
    [isReady, isSignedIn, completeLogin, logout, handleUnauthorized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
