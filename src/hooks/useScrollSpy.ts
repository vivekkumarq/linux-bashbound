import { useEffect, useState } from "react";

/**
 * Tracks which section is currently being read.
 *
 * Uses one IntersectionObserver over the section elements rather than
 * measuring positions on scroll, so nothing runs while you are actually
 * scrolling. The rootMargin biases the "active" band towards the top third of
 * the viewport, which is where the eye usually is.
 */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) return undefined;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return undefined;

    // Remember the latest ratio per section so that when several are on
    // screen we can pick the most visible one rather than whichever fired
    // last.
    const visibility = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      {
        rootMargin: "-10% 0px -60% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join("|")]);

  return active;
}
