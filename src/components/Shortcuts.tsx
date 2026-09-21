import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { lessonNeighbours } from "../lib/learning";
import { themes } from "../appearance";

/**
 * Single-key shortcuts and the help dialog that documents them.
 *
 * Ctrl+K and Ctrl+` belong to the command palette; everything unmodified
 * lives here. Nothing fires while a field has focus, so typing a lesson search
 * for "networking" never jumps you to the next page.
 */

const KEYS = [
  { keys: ["/"], what: "Focus the header search" },
  { keys: ["Ctrl", "K"], what: "Open the command palette" },
  { keys: ["Ctrl", "`"], what: "Open the simulated shell" },
  { keys: ["n"], what: "Next module (on a lesson)" },
  { keys: ["p"], what: "Previous module (on a lesson)" },
  { keys: ["g", "then", "r"], what: "Go to the roadmap" },
  { keys: ["g", "then", "l"], what: "Go to the lessons index" },
  { keys: ["g", "then", "c"], what: "Go to the command explorer" },
  { keys: ["g", "then", "i"], what: "Go to the interview arena" },
  { keys: ["t"], what: "Cycle the theme" },
  { keys: ["f"], what: "Toggle focus mode" },
  { keys: ["r"], what: "Random interview question" },
  { keys: ["?"], what: "Show this list" },
  { keys: ["Esc"], what: "Close any overlay" },
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function Shortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { progress, setProgress, setTheme } = useStore();

  // Focus mode is a document-level flag so CSS can hide the shell without
  // every page needing to know about it.
  useEffect(() => {
    document.documentElement.dataset.focus = progress.focusMode ? "on" : "off";
  }, [progress.focusMode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setHelpOpen(false);
        setPendingG(false);
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      // Two-key "go to" sequences.
      if (pendingG) {
        const routes: Record<string, string> = {
          r: "/roadmap",
          l: "/learn",
          c: "/commands",
          i: "/interview",
          q: "/quizzes",
          t: "/terminal",
          p: "/progress",
          h: "/",
        };
        const to = routes[e.key.toLowerCase()];
        setPendingG(false);
        if (to) {
          e.preventDefault();
          nav(to);
        }
        return;
      }

      switch (e.key) {
        case "?":
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        case "g":
          setPendingG(true);
          break;
        case "f":
          e.preventDefault();
          setProgress((p) => ({ ...p, focusMode: !p.focusMode }));
          break;
        case "t": {
          e.preventDefault();
          const ids = themes.map((x) => x.id);
          const i = ids.indexOf(progress.theme);
          setTheme(ids[(i + 1) % ids.length]);
          break;
        }
        case "r":
          e.preventDefault();
          nav("/interview?random=1");
          break;
        case "n":
        case "p": {
          if (!loc.pathname.startsWith("/learn/")) return;
          const slug = loc.pathname.slice("/learn/".length);
          const { previous, next } = lessonNeighbours(slug);
          const target = e.key === "n" ? next : previous;
          if (target) {
            e.preventDefault();
            nav(`/learn/${target.slug}`);
          }
          break;
        }
        default:
          break;
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [nav, loc.pathname, pendingG, progress.theme, setProgress, setTheme]);

  // Clear a dangling "g" if the next key never comes.
  useEffect(() => {
    if (!pendingG) return undefined;
    const id = window.setTimeout(() => setPendingG(false), 1200);
    return () => window.clearTimeout(id);
  }, [pendingG]);

  return (
    <>
      {progress.focusMode ? (
        <button
          type="button"
          className="focus-toggle"
          onClick={() => setProgress((p) => ({ ...p, focusMode: false }))}
        >
          Exit focus mode <kbd>f</kbd>
        </button>
      ) : null}

      {helpOpen ? (
        <div className="sc-backdrop" role="presentation" onClick={() => setHelpOpen(false)}>
          <div
            className="sc-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sc-head">
              <h2>Keyboard shortcuts</h2>
              <button type="button" className="btn btn-ghost btn-compact" onClick={() => setHelpOpen(false)}>
                Close
              </button>
            </header>
            <ul className="sc-list">
              {KEYS.map((row) => (
                <li key={row.what}>
                  <span className="sc-keys">
                    {row.keys.map((k) =>
                      k === "then" ? (
                        <span key={k} className="sc-then">
                          then
                        </span>
                      ) : (
                        <kbd key={k}>{k}</kbd>
                      ),
                    )}
                  </span>
                  <span className="sc-what">{row.what}</span>
                </li>
              ))}
            </ul>
            <p className="muted sc-foot">Shortcuts are ignored while you are typing in a field.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
