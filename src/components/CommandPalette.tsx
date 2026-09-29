import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePalette } from "../lib/paletteContext";
import { scoreMatch } from "../utils/search";
import { useSearchCorpus } from "../hooks/useSearchCorpus";
import { SIMULATED } from "../lib/terminalEngine";
import { Terminal } from "./Terminal";

export function CommandPalette() {
  const pal = usePalette();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pal.open) {
      setQ("");
      setTimeout(() => input.current?.focus(), 20);
    }
  }, [pal.open, pal.tab]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (pal.open) pal.close();
        else pal.openJump();
      }
      if (meta && e.key === "`") {
        e.preventDefault();
        pal.openBash();
      }
      if (e.key === "Escape" && pal.open) pal.close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pal]);

  const corpus = useSearchCorpus();

  const hits = useMemo(() => {
    if (q.trim().length < 1 || !corpus) return [];
    const out: { href: string; title: string; kind: string; score: number }[] = [];
    for (const entry of corpus) {
      // The palette is for jumping to a place, so it searches destinations
      // rather than the question bank.
      if (entry.kind === "Interview") continue;
      const score = scoreMatch(q, entry.haystack);
      if (!score) continue;
      out.push({ href: entry.href, title: entry.title, kind: entry.kind, score: score + entry.bonus });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [q, corpus]);

  if (!pal.open) return null;

  const chips = ["help", "pwd", "ls -l", "ls -la ~", "cat Documents/notes.txt", "cd /etc", "cat hostname", "uname -a", "whoami", "grep ERROR /var/log/syslog", "mkdir -p labs/one", "echo hello"];

  return (
    <div className="palette-scrim" onClick={pal.close} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette and live bash"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-tabs">
          <button type="button" className={pal.tab === "jump" ? "on" : ""} onClick={pal.openJump}>
            Jump
          </button>
          <button type="button" className={pal.tab === "bash" ? "on" : ""} onClick={() => pal.openBash()}>
            Live bash
          </button>
          <span className="palette-kbd">
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
            <span>or</span>
            <kbd>Ctrl</kbd>
            <kbd>`</kbd>
          </span>
          <button type="button" className="palette-x" onClick={pal.close} aria-label="Close">
            Esc
          </button>
        </div>

        {pal.tab === "jump" ? (
          <>
            <input
              ref={input}
              className="palette-input"
              placeholder="Go to a lesson or command…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) {
                  nav(hits[0].href);
                  pal.close();
                }
              }}
            />
            <div className="palette-hits">
              {hits.length === 0 ? (
                <p className="muted" style={{ padding: "8px 4px" }}>
                  Type chmod, systemd, inode… or switch to Live bash to run simulated Unix commands.
                </p>
              ) : (
                hits.map((h) => (
                  <button
                    key={h.href + h.title}
                    type="button"
                    className="palette-hit"
                    onClick={() => {
                      nav(h.href);
                      pal.close();
                    }}
                  >
                    <span className="badge">{h.kind}</span>
                    {h.title}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="palette-bash">
            <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
              Simulation Mode — a fake filesystem in this browser. Nothing runs on the host. Try{" "}
              {SIMULATED.slice(0, 8).join(", ")}…
            </p>
            <div className="chip-row">
              {chips.map((c) => (
                <button key={c} type="button" className="chip" onClick={() => pal.openBash(c)}>
                  {c}
                </button>
              ))}
            </div>
            <Terminal key={pal.runKey} compact autoFocus seed={pal.seed ?? undefined} />
          </div>
        )}
      </div>
    </div>
  );
}
