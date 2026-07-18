import { useState } from "react";

import { AskScreen } from "@/features/ask/AskScreen";
import { DEFAULT_COUNTY } from "@/constants/counties";
import { OfflineScreen } from "@/features/offline/OfflineScreen";
import { useNetworkStatus } from "@/features/offline/useNetworkStatus";

export default function AskRoute() {
  const { isOffline, refresh } = useNetworkStatus();
  // County shown on the offline screen; mirrors the Ask default for now.
  const [county] = useState(DEFAULT_COUNTY);

  if (isOffline) {
    return (
      <OfflineScreen
        county={county}
        lastSyncedLabel="Last synced 2 hours ago"
        onReconnect={() => void refresh()}
      />
    );
  }
  return <AskScreen />;
}
