import { useEffect, useRef, useState } from "react";
import { freshState, promptPath, runCommand, type TermState } from "../lib/terminalEngine";

export function Terminal({
  initialCommands,
  compact,
}: {
  initialCommands?: string[];
  compact?: boolean;
}) {
  const [state, setState] = useState<TermState>(() => freshState());
  const [lines, setLines] = useState<{ q: string; a: string }[]>([]);
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  function exec(raw: string) {
    const { output, state: next } = runCommand(state, raw);
    setState(next);
    if (output === "__CLEAR__") {
      setLines([]);
      return;
    }
    setLines((l) => [...l, { q: raw, a: output }]);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      exec(value);
      setValue("");
      setHistIdx(null);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = state.history;
      if (!h.length) return;
      const i = histIdx === null ? h.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(i);
      setValue(h[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = state.history;
      if (histIdx === null) return;
      const i = histIdx + 1;
      if (i >= h.length) {
        setHistIdx(null);
        setValue("");
      } else {
        setHistIdx(i);
        setValue(h[i]);
      }
    }
  }

  return (
    <div className="terminal" onClick={() => input.current?.focus()}>
      <div className="terminal-bar">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span>student@bashbound — Simulation Mode</span>
        <span style={{ marginLeft: "auto" }} className="badge">
          not a real shell
        </span>
      </div>
      <div className="terminal-body" style={{ minHeight: compact ? 180 : 280, maxHeight: compact ? 280 : 420, overflow: "auto" }}>
        {initialCommands?.map((c) => (
          <div key={c}>
            <div>
              <span className="prompt">student@bashbound:{promptPath(state)}$</span> {c}
            </div>
          </div>
        ))}
        {lines.map((l, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div>
              <span className="prompt">student@bashbound:{promptPath(state)}$</span> {l.q}
            </div>
            {l.a ? <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{l.a}</pre> : null}
          </div>
        ))}
        <div>
          <span className="prompt">student@bashbound:{promptPath(state)}$</span>{" "}
          <input
            ref={input}
            className="term-input"
            aria-label="Simulated command"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div ref={end} />
      </div>
      <div style={{ padding: "8px 12px", borderTop: "1px solid #243140", fontSize: 12, color: "#8aa0b5", display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setState(freshState())}>
          Reset environment
        </button>
        <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => exec("help")}>
          help
        </button>
      </div>
    </div>
  );
}
