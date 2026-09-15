import { useEffect, useRef, useState } from "react";
import { fonts, themes, type FontId, type ThemeId } from "../appearance";
import { useStore } from "../hooks/useStore";

export function AppearanceMenu() {
  const { progress, setTheme, setFont } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="appear-wrap" ref={box}>
      <button
        className="icon-btn"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Appearance"
        title="Theme and type"
        onClick={() => setOpen((v) => !v)}
      >
        Aa
      </button>
      {open ? (
        <div className="appear-panel" role="dialog" aria-label="Appearance">
          <p className="kicker">Theme</p>
          <div className="theme-grid">
            {themes.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${progress.theme === t.id ? "active" : ""}`}
                onClick={() => setTheme(t.id as ThemeId)}
              >
                <span className="swatch" style={{ background: t.swatch, boxShadow: `inset 0 0 0 2px ${t.accent}` }} />
                {t.label}
              </button>
            ))}
          </div>
          <p className="kicker" style={{ marginTop: 14 }}>
            Typeface
          </p>
          <div className="font-grid">
            {fonts.map((f) => (
              <button
                key={f.id}
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
