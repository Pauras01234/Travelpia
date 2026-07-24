/**
 * A representative photo for a county, for the Home hero card. Reuses the
 * backend /places/photo (Serper Images) endpoint. Soft-fails to null so the
 * hero falls back to its solid-colour placeholder.
 */
import { useEffect, useState } from "react";

import { fetchPlacePhoto } from "@/api/places";

export function useCountyImage(county: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setUrl(null);
    fetchPlacePhoto(`${county} Ireland landscape`, { signal: controller.signal })
      .then((u) => {
        if (!controller.signal.aborted) setUrl(u);
      })
      .catch(() => {
        /* soft-fail — hero uses its placeholder */
      });
    return () => controller.abort();
  }, [county]);

  return url;
}
