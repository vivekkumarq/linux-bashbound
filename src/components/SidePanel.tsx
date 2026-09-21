import { useState, type ReactNode } from "react";

/**
 * A sidebar that turns into a disclosure on narrow screens.
 *
 * Above the layout breakpoint it is an ordinary column and the toggle is
 * hidden. Below it, the contents collapse behind a labelled button so a
 * 40-module or 128-command list does not sit between the reader and the page
 * they actually opened.
 *
 * The previous approach flexed the whole <aside> into a horizontal scroller,
 * which worked for a list of links but shredded any sidebar that also held a
 * heading, a search box and a select.
 */
export function SidePanel({
  title,
  summary,
  children,
  label,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="side-panel" aria-label={label ?? title}>
      <button
        type="button"
        className="side-panel-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="side-panel-title">{title}</span>
        {summary ? <span className="side-panel-meta">{summary}</span> : null}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 9l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`side-panel-body${open ? " is-open" : ""}`}>{children}</div>
    </aside>
  );
}
