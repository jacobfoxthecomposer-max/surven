"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when reduced-motion is NOT preferred.
 * Use to conditionally enable animations per UI/UX Pro Max guidelines.
 */
export function useAnimationEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setEnabled(!mq.matches);

    const handler = (e: MediaQueryListEvent) => setEnabled(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return enabled;
}
