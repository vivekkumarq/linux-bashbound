import { NavLink, useLocation } from "react-router-dom";
import { usePalette } from "../lib/paletteContext";

/**
 * Mobile quick navigation.
 *
 * Five destinations within thumb reach, so the common moves never require
 * opening the drawer. Only rendered below the layout breakpoint (shell.css).
 */

const ITEMS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: "/", label: "Home", icon: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", end: true },
  { to: "/roadmap", label: "Roadmap", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" },
  { to: "/commands", label: "Commands", icon: "M7 4a3 3 0 1 0 3 3v10a3 3 0 1 1-3-3h10a3 3 0 1 0-3-3V7a3 3 0 1 1 3 3H7Z" },
  { to: "/interview", label: "Arena", icon: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 2.8V20M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 2.8V20M12 4v16" },
];

export function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pal = usePalette();
  const { pathname } = useLocation();

  return (
    <nav className="bottombar" aria-label="Quick navigation">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bb-item${isActive ? " is-on" : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={item.icon} />
          </svg>
          <b>{item.label}</b>
        </NavLink>
      ))}

      <button
        type="button"
        className={`bb-item${pathname === "/terminal" ? " is-on" : ""}`}
        onClick={() => pal.openBash()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16v14H4zM7 10l3 2-3 2m5 1h5" />
        </svg>
        <b>Shell</b>
      </button>

      <button type="button" className="bb-item bb-more" onClick={onMenu}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        <b>More</b>
      </button>
    </nav>
  );
}
