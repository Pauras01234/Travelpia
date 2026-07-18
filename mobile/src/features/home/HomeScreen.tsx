/**
 * Home tab. The full Home experience is a separate work item; for now this
 * demonstrates the loading pattern — it shows the skeleton on mount, then the
 * loaded placeholder. Swap the timer for the real data fetch when Home is built.
 */
import { useEffect, useState } from "react";

import { ComingSoon } from "@/components/ComingSoon";

import { HomeSkeleton } from "./HomeSkeleton";

export function HomeScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(id);
  }, []);

  if (loading) return <HomeSkeleton />;
  return <ComingSoon title="Home" icon="home-outline" />;
}
