import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { StoreContext } from "./hooks/useStore";
import { defaultProgress, loadProgress, saveProgress, updateStreak } from "./utils/storage";
import type { ProgressState } from "./types";
import { paletteIsDark, resolvePalette, type FontId, type ThemeId } from "./appearance";

export default function App() {
  const [progress, setProgressState] = useState<ProgressState>(() => defaultProgress());
  const [ready, setReady] = useState(false);
  const [prefersLight, setPrefersLight] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    setPrefersLight(mq.matches);
    const onChange = () => setPrefersLight(mq.matches);
    mq.addEventListener("change", onChange);
    const loaded = updateStreak(loadProgress());
    setProgressState(loaded);
    saveProgress(loaded);
    setReady(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const palette = resolvePalette(progress.theme, prefersLight);

  useEffect(() => {
    if (!ready) return;
    saveProgress(progress);
    document.documentElement.dataset.theme = palette;
    document.documentElement.dataset.font = progress.font;
    document.documentElement.style.colorScheme = paletteIsDark(palette) ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#090c11");
  }, [progress, ready, palette]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const titles: Record<string, string> = {
      "/": "Linux BashBound — From First Command to System Mastery",
      "/roadmap": "Roadmap · Linux BashBound",
      "/learn": "Learn · Linux BashBound",
      "/commands": "Commands · Linux BashBound",
      "/interview": "Interview Arena · Linux BashBound",
      "/quizzes": "Quizzes · Linux BashBound",
      "/challenges": "Daily Challenge · Linux BashBound",
      "/cheatsheets": "Cheat Sheets · Linux BashBound",
      "/troubleshooting": "Troubleshooting Lab · Linux BashBound",
      "/progress": "My Learning · Linux BashBound",
      "/terminal": "Terminal · Linux BashBound",
    };
    const hit = Object.keys(titles).find((k) => (k === "/" ? loc.pathname === "/" : loc.pathname.startsWith(k)));
    if (hit) document.title = titles[hit];
  }, [loc.pathname]);

  const themeResolved: "dark" | "light" = paletteIsDark(palette) ? "dark" : "light";

  function setProgress(next: ProgressState | ((p: ProgressState) => ProgressState)) {
    setProgressState((p) => (typeof next === "function" ? next(p) : next));
  }

  const store = useMemo(
    () => ({
      progress,
      setProgress,
      themeResolved,
      setTheme: (t: ThemeId) => setProgress((p) => ({ ...p, theme: t })),
      setFont: (f: FontId) => setProgress((p) => ({ ...p, font: f })),
    }),
    [progress, themeResolved],
  );

  return (
    <StoreContext.Provider value={store}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <Navbar />
        <main id="main" className="main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </StoreContext.Provider>
  );
}
