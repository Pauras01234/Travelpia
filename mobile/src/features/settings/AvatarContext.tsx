/**
 * Local profile-picture store. The picked image URI is persisted on-device
 * (AsyncStorage) and shared via context so Profile/Home/Settings show it.
 *
 * Device-local for now: syncing the avatar to the account needs a Supabase
 * Storage `avatars` bucket + an `avatar_url` column on `profiles` (a follow-up).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "travelpia:avatar_uri:v1";

interface AvatarContextValue {
  avatarUri: string | null;
  setAvatarUri: (uri: string | null) => void;
}

const AvatarContext = createContext<AvatarContextValue | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatarUri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!cancelled && v) setUri(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AvatarContextValue>(
    () => ({
      avatarUri,
      setAvatarUri: (uri) => {
        setUri(uri);
        if (uri) {
          AsyncStorage.setItem(STORAGE_KEY, uri).catch(() => {});
        } else {
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      },
    }),
    [avatarUri],
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) {
    throw new Error("useAvatar must be used within an AvatarProvider");
  }
  return ctx;
}
