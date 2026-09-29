import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { AppearanceMenu } from "./Appearance";
import { useStore } from "../hooks/useStore";
import { scoreMatch } from "../utils/search";
import { useSearchCorpus } from "../hooks/useSearchCorpus";
import { usePalette } from "../lib/paletteContext";

const links = [
  { to: "/learn", label: "Learn" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/commands", label: "Commands" },
  { to: "/interview", label: "Interview" },
  { to: "/quizzes", label: "Quizzes", wide: true },
  { to: "/challenges", label: "Challenges", wide: true },
  { to: "/cheatsheets", label: "Cheat Sheets", wide: true },
] as const;

export function Navbar() {
  const { progress } = useStore();
  const pal = usePalette();
  const [open, setOpen] = useState(false);
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
        setOpen(false);
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
              setOpen(false);
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
                    setOpen(false);
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
          className="icon-btn ghost-icon mobile-only"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          )}
        </button>
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <Logo />
          <span className="brand-text">
            <strong>
              Linux <em>BashBound</em>
            </strong>
            <small>From first command to mastery</small>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `${"wide" in l && l.wide ? "wide " : ""}${isActive ? "active" : ""}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          {renderSearch()}
          <button type="button" className="type-btn hide-sm" onClick={() => pal.openBash()} title="Live bash (Ctrl+`)">
            <span className="mono" style={{ fontWeight: 700 }}>$</span>
            <span className="font-name">Bash</span>
          </button>
          <button type="button" className="type-btn hide-sm" onClick={pal.openJump} title="Jump (Ctrl+K)">
            <span className="font-name">Ctrl+K</span>
          </button>
          <Link className="progress-chip" to="/progress" title="My learning">
            {progress.completedTopics.length}
            <span>done</span>
          </Link>
          <AppearanceMenu />
        </div>
      </div>
      {open ? (
        <div className="drawer">
          {renderSearch(true)}
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/troubleshooting" onClick={() => setOpen(false)}>
            Troubleshooting
          </NavLink>
          <NavLink to="/progress" onClick={() => setOpen(false)}>
            My learning
          </NavLink>
          <NavLink to="/terminal" onClick={() => setOpen(false)}>
            Terminal
          </NavLink>
          <button type="button" className="drawer-bash" onClick={() => { setOpen(false); pal.openBash(); }}>
            Open live bash
          </button>
        </div>
      ) : null}
    </header>
  );
}
