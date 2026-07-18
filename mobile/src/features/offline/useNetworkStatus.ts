/**
 * Reactive connectivity status via NetInfo. `isOffline` updates live as the
 * device connects/disconnects; `refresh` forces a check (for a "try to
 * reconnect" action) and resolves to the latest offline state.
 */
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useState } from "react";

function computeOffline(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): boolean {
  // `isInternetReachable` can be null (unknown) before the first probe — only
  // treat an explicit `false` as offline to avoid false positives on launch.
  return state.isConnected === false || state.isInternetReachable === false;
}

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(computeOffline(state));
    });
    return () => unsubscribe();
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const offline = computeOffline(state);
    setIsOffline(offline);
    return offline;
  }, []);

  return { isOffline, refresh };
}
