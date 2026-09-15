import { useEffect, useRef, useState } from "react";
import { fontLabel, fonts, themes, type FontId, type ThemeId } from "../appearance";
import { useStore } from "../hooks/useStore";

export function AppearanceMenu() {
  const { progress, setTheme, setFont, themeResolved } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const dark = themeResolved === "dark";

  return (
    <div className="appear-wrap" ref={box}>
      <button
        type="button"
        className="icon-btn ghost-icon"
        onClick={() => setTheme(dark ? "light" : "dark")}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        title={dark ? "Light theme" : "Dark theme"}
      >
        {dark ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="type-btn"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Appearance"
        title="Typeface and theme"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7V5h16v2M9 19h6M12 5v14" />
        </svg>
        <span className="font-name">{fontLabel(progress.font)}</span>
      </button>
      {open ? (
        <div className="appear-panel" role="dialog" aria-label="Appearance">
          <p className="panel-title">Theme</p>
          <div className="theme-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-swatch ${progress.theme === t.id ? "active" : ""}`}
                onClick={() => setTheme(t.id as ThemeId)}
              >
                <span className="swatch" style={{ background: t.swatch, boxShadow: `inset 0 0 0 2px ${t.accent}` }} />
                {t.label}
              </button>
            ))}
          </div>
          <p className="panel-title">Typeface</p>
          <div className="font-grid">
            {fonts.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`font-swatch ${progress.font === f.id ? "active" : ""}`}
                style={{ fontFamily: f.family }}
                onClick={() => setFont(f.id as FontId)}
              >
                <strong>{f.sample}</strong>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
