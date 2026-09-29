import { useEffect, useRef } from "react";

/**
 * A thin progress bar showing how far through a long page you are.
 *
 * Where the browser supports scroll-driven animations the whole thing runs on
 * the compositor from CSS alone (see .read-progress in polish.css) and this
 * component never touches the DOM on scroll. Everywhere else it falls back to
 * a passive listener that writes one custom property inside rAF.
 */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supportsScrollTimeline =
      typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    if (supportsScrollTimeline) return undefined;

    const el = ref.current;
    if (!el) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      el.style.setProperty("--read-progress", String(Math.min(1, Math.max(0, ratio))));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div className="read-progress" ref={ref} aria-hidden="true" />;
}
