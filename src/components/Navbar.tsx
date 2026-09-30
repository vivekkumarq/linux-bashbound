import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { AppearanceMenu } from "./Appearance";
import { useStore } from "../hooks/useStore";
import { scoreMatch } from "../utils/search";
import { useSearchCorpus } from "../hooks/useSearchCorpus";
import { usePalette } from "../lib/paletteContext";


export function Navbar({ onMenu }: { onMenu: () => void }) {
  const { progress } = useStore();
  const pal = usePalette();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const nav = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const corpus = useSearchCorpus();

  const results = useMemo(() => {
    if (q.trim().length < 2 || !corpus) return [];
    const hits: { href: string; title: string; kind: string; score: number }[] = [];
    for (const entry of corpus) {
      const score = scoreMatch(q, entry.haystack);
      if (!score) continue;
      // Interview questions are the largest slice of the corpus; requiring a
      // stronger match keeps them from crowding out modules and commands.
      if (entry.kind === "Interview" && score <= 4) continue;
      hits.push({ href: entry.href, title: entry.title, kind: entry.kind, score: score + entry.bonus });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [q, corpus]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        searchRef.current?.blur();
      }
    }
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  function renderSearch(mobile = false) {
    return (
      <div className={`search-wrap ${mobile ? "search-wrap--mobile" : ""}`} ref={mobile ? undefined : wrapRef}>
        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={mobile ? undefined : searchRef}
          className="nav-search"
          placeholder="Search chmod, systemd…"
          aria-label="Search topics, commands, questions"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              nav(results[0].href);
              setSearchOpen(false);
              setQ("");
            }
          }}
        />
        {!mobile ? <kbd className="kbd-hint">/</kbd> : null}
        {searchOpen && q.trim().length >= 2 && (
          <div className="search-panel" role="listbox">
            {results.length === 0 ? (
              <p className="muted" style={{ margin: 0, padding: 10 }}>
                No matches. Try chmod, systemd, or zombie.
              </p>
            ) : (
              results.map((r) => (
                <Link
                  key={r.href + r.title}
                  className="sr-item"
                  to={r.href}
                  onClick={() => {
                    setSearchOpen(false);
                    setQ("");
                  }}
                >
                  <span className="badge">{r.kind}</span>
                  <span>{r.title}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <button
          type="button"
          className="icon-btn ghost-icon menu-toggle"
          aria-label="Toggle navigation"
          onClick={onMenu}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Link className="brand" to="/" >
          <Logo />
          <span className="brand-text">
            <strong>
              Linux <em>BashBound</em>
            </strong>
            <small>From first command to mastery</small>
          </span>
        </Link>
        <div className="nav-actions">
          {renderSearch()}
          <button type="button" className="type-btn hide-sm" onClick={() => pal.openBash()} title="Live bash (Ctrl+`)">
            <span className="mono" style={{ fontWeight: 700 }}>$</span>
            <span className="font-name">Bash</span>
          </button>
          <Link className="progress-chip" to="/progress" title="My learning">
            {progress.completedTopics.length}
            <span>done</span>
          </Link>
          <AppearanceMenu />
        </div>
      </div>
    </header>
  );
}
