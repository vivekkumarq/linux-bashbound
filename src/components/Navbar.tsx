import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { AppearanceMenu } from "./Appearance";
import { useStore } from "../hooks/useStore";
import { commands } from "../data/commands";
import { topics } from "../data/topics";
import { questions } from "../data/questions";
import { cheatSheets } from "../data/cheatsheets";
import { scoreMatch } from "../utils/search";

const links = [
  ["/learn", "Learn"],
  ["/roadmap", "Roadmap"],
  ["/commands", "Commands"],
  ["/interview", "Interview"],
  ["/quizzes", "Quizzes"],
  ["/challenges", "Challenges"],
  ["/cheatsheets", "Cheat Sheets"],
  ["/troubleshooting", "Troubleshooting"],
] as const;

export function Navbar() {
  const { progress } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const nav = useNavigate();

  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const hits: { href: string; title: string; kind: string; score: number }[] = [];
    for (const t of topics) {
      const s = scoreMatch(q, `${t.title} ${t.summary} ${t.slug}`);
      if (s) hits.push({ href: `/learn/${t.slug}`, title: t.title, kind: "Topic", score: s });
    }
    for (const c of commands) {
      const s = scoreMatch(q, `${c.name} ${c.summary} ${c.purpose}`);
      if (s) hits.push({ href: `/commands/${c.name}`, title: c.name, kind: "Command", score: s + 1 });
    }
    for (const sheet of cheatSheets) {
      const s = scoreMatch(q, `${sheet.title} ${sheet.description}`);
      if (s) hits.push({ href: `/cheatsheets/${sheet.slug}`, title: sheet.title, kind: "Cheat sheet", score: s });
    }
    for (const qu of questions.slice(0, 400)) {
      const s = scoreMatch(q, qu.question + qu.tags.join(" "));
      if (s > 4) hits.push({ href: `/interview/${qu.id}`, title: qu.question, kind: "Interview", score: s });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [q]);

  function SearchField({ mobile }: { mobile?: boolean }) {
    return (
      <input
        className="input nav-search"
        style={mobile ? { width: "100%" } : undefined}
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
          }
        }}
      />
    );
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" to="/" aria-label="Linux BashBound home" onClick={() => setOpen(false)}>
          <Logo />
          Linux BashBound
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="row" style={{ position: "relative", marginLeft: "auto" }}>
          <SearchField />
          {searchOpen && q.trim().length >= 2 && (
            <div className="search-panel" role="listbox">
              {results.length === 0 ? (
                <p className="muted">No matches. Try chmod, systemd, or zombie.</p>
              ) : (
                results.map((r) => (
                  <Link
                    key={r.href + r.title}
                    to={r.href}
                    onClick={() => {
                      setSearchOpen(false);
                      setQ("");
                      setOpen(false);
                    }}
                    style={{ display: "block", padding: 8 }}
                  >
                    <span className="badge">{r.kind}</span> {r.title}
                  </Link>
                ))
              )}
            </div>
          )}
          <Link className="icon-btn" to="/progress" aria-label="My learning" title="My learning">
            {progress.completedTopics.length}
          </Link>
          <AppearanceMenu />
          <button
            className="icon-btn mobile-only"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="drawer">
          <SearchField mobile />
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <NavLink to="/progress" onClick={() => setOpen(false)}>
            My learning
          </NavLink>
          <NavLink to="/terminal" onClick={() => setOpen(false)}>
            Terminal
          </NavLink>
        </div>
      ) : null}
    </header>
  );
}
