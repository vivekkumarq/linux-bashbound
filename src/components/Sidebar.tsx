import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { stats } from "../data/stats.generated";
import { useStore } from "../hooks/useStore";
import { courseTopics, levels, overallPercent } from "../lib/learning";

/**
 * The primary navigation.
 *
 * It lives in a persistent rail rather than a row of links in the header: a
 * header row has a hard width budget and silently clips once the brand, the
 * search field and the controls have taken their share. A rail has vertical
 * room, so every destination can carry an icon and its real count.
 *
 * The curriculum is part of it. Sixteen levels and forty modules are what
 * people actually navigate between, and burying them behind a page you have
 * to visit first means every module change is two clicks and a scroll. Here
 * the level containing whatever you are reading opens itself, so the next
 * module is always one click away.
 *
 * Below the layout breakpoint the whole rail becomes a slide-in drawer.
 */

interface NavItem {
  to: string;
  label: string;
  icon: string;
  count?: string;
  end?: boolean;
}

const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Learn",
    items: [
      { to: "/roadmap", label: "Roadmap", icon: "map", count: `${stats.levels}` },
      { to: "/learn", label: "Beginner path", icon: "book", end: true },
      { to: "/terminal", label: "Terminal", icon: "terminal" },
    ],
  },
  {
    heading: "Practice",
    items: [
      { to: "/interview", label: "Interview arena", icon: "brain", count: stats.questions.toLocaleString() },
      { to: "/quizzes", label: "Quizzes", icon: "target", count: `${stats.mcq}` },
      { to: "/challenges", label: "Daily challenge", icon: "flame", count: `${stats.challenges}` },
      { to: "/troubleshooting", label: "Incident labs", icon: "alert", count: `${stats.labs}` },
    ],
  },
  {
    heading: "Reference",
    items: [
      { to: "/commands", label: "Commands", icon: "command", count: `${stats.commands}` },
      { to: "/cheatsheets", label: "Cheat sheets", icon: "list", count: `${stats.cheatSheets}` },
      { to: "/glossary", label: "Glossary", icon: "book", count: `${stats.glossary}` },
    ],
  },
];

const ICONS: Record<string, string> = {
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 17H6",
  terminal: "M4 5h16v14H4zM7 10l3 2-3 2m5 1h5",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 2.8V20M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 2.8V20M12 4v16",
  target: "M12 3v3m0 12v3M3 12h3m12 0h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",
  flame: "M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.7 1-3 1-3s.5 1.5 2 1.5C11 8 12 3 12 3Z",
  alert: "M12 4 2.5 20h19zM12 10v4m0 3h.01",
  command: "M7 4a3 3 0 1 0 3 3v10a3 3 0 1 1-3-3h10a3 3 0 1 0-3-3V7a3 3 0 1 1 3 3H7Z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  gauge: "M12 19a8 8 0 1 1 8-8M12 19h8M12 12l4-3",
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg className="rail-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.book} />
    </svg>
  );
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { progress } = useStore();
  const { pathname } = useLocation();
  const percent = overallPercent(progress);

  // Which module is open right now, if any.
  const activeSlug = pathname.startsWith("/learn/") ? pathname.slice("/learn/".length) : null;
  const activeLevel = activeSlug ? courseTopics.find((t) => t.slug === activeSlug)?.level ?? null : null;

  const [openLevel, setOpenLevel] = useState<number | null>(activeLevel);

  // Follow the reader: opening a module expands the level it belongs to, while
  // still letting the level headers be toggled by hand. Adjusting during render
  // rather than in an effect means the tree is never painted in the old state
  // first.
  const [seenLevel, setSeenLevel] = useState(activeLevel);
  if (seenLevel !== activeLevel) {
    setSeenLevel(activeLevel);
    if (activeLevel !== null) setOpenLevel(activeLevel);
  }

  return (
    <aside className={`rail${open ? " is-open" : ""}`} aria-label="Sections">
      <div className="rail-inner">
        <div className="rail-head">
          <span>Course</span>
          <span className="rail-pill">{percent}%</span>
        </div>

        <nav className="rail-tree">
          {GROUPS.map((group) => (
            <div className="rail-group" key={group.heading}>
              <p className="rail-group-head">{group.heading}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `rail-link${isActive ? " is-active" : ""}`}
                  onClick={onNavigate}
                >
                  <NavIcon name={item.icon} />
                  <span className="rail-label">{item.label}</span>
                  {item.count ? <span className="rail-count">{item.count}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}

          <div className="rail-group">
            <p className="rail-group-head">
              Curriculum <span className="rail-count">{stats.topics}</span>
            </p>

            {levels.map((level) => {
              const modules = courseTopics.filter((t) => t.level === level.id);
              const done = modules.filter((m) => progress.completedTopics.includes(m.slug)).length;
              const isOpen = openLevel === level.id;

              return (
                <div className={`lvl${isOpen ? " is-open" : ""}`} key={level.id}>
                  <button
                    type="button"
                    className={`lvl-btn${activeLevel === level.id ? " is-current" : ""}`}
                    aria-expanded={isOpen}
                    onClick={() => setOpenLevel(isOpen ? null : level.id)}
                  >
                    <span className="lvl-num">{String(level.id).padStart(2, "0")}</span>
                    <span className="lvl-name">{level.title}</span>
                    <span className="lvl-count">
                      {done}/{modules.length}
                    </span>
                    <svg className="lvl-chev" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className="lvl-body">
                    <div>
                      {modules.map((m) => (
                        <NavLink
                          key={m.slug}
                          to={`/learn/${m.slug}`}
                          className={({ isActive }) => `lvl-link${isActive ? " is-active" : ""}`}
                          onClick={onNavigate}
                        >
                          <span className="lvl-tick" aria-hidden="true">
                            {progress.completedTopics.includes(m.slug) ? "✓" : "○"}
                          </span>
                          <span className="lvl-link-label">{m.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="rail-foot">
          <NavLink
            to="/progress"
            className={({ isActive }) => `rail-link${isActive ? " is-active" : ""}`}
            onClick={onNavigate}
          >
            <NavIcon name="gauge" />
            <span className="rail-label">My learning</span>
            <span className="rail-count">{progress.completedTopics.length}</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
