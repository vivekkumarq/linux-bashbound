import { useEffect, useRef, useState } from "react";
import { completionsFor, freshState, promptPath, runCommand, type TermState } from "../lib/terminalEngine";

/**
 * The simulated shell.
 *
 * Everything runs against an in-memory filesystem in this tab. No command
 * reaches the host, which is exactly what makes destructive commands safe to
 * practise here.
 */
export function Terminal({
  initialCommands,
  compact,
  autoFocus,
  seed,
}: {
  initialCommands?: string[];
  compact?: boolean;
  autoFocus?: boolean;
  seed?: string;
}) {
  const [state, setState] = useState<TermState>(() => freshState());
  const [lines, setLines] = useState<{ q: string; a: string }[]>([]);
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus, lines]);

  function exec(raw: string) {
    const { output, state: next } = runCommand(stateRef.current, raw);
    stateRef.current = next;
    setState(next);
    if (output === "__CLEAR__") {
      setLines([]);
      return;
    }
    setLines((l) => [...l, { q: raw, a: output }]);
  }

  useEffect(() => {
    if (!seed || seeded.current) return;
    seeded.current = true;
    exec(seed.trim());
  }, [seed]);

  function complete() {
    const options = completionsFor(stateRef.current, value);
    if (options.length === 0) return;

    const parts = value.split(/\s+/);
    if (options.length === 1) {
      parts[parts.length - 1] = options[0];
      setValue(parts.join(" "));
      return;
    }

    // Several candidates: fill in the longest shared prefix, then list them —
    // the same thing bash does on a second Tab.
    const shared = options.reduce((acc, option) => {
      let i = 0;
      while (i < acc.length && i < option.length && acc[i] === option[i]) i += 1;
      return acc.slice(0, i);
    });
    if (shared.length > (parts[parts.length - 1] ?? "").length) {
      parts[parts.length - 1] = shared;
      setValue(parts.join(" "));
      return;
    }
    setLines((l) => [...l, { q: value, a: options.join("  ") }]);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      exec(value);
      setValue("");
      setHistIdx(null);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      complete();
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
      return;
    }
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      setLines((l) => [...l, { q: `${value}^C`, a: "" }]);
      setValue("");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = stateRef.current.history;
      if (!h.length) return;
      const i = histIdx === null ? h.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(i);
      setValue(h[i]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = stateRef.current.history;
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

  async function copyTranscript() {
    const text = lines.map((l) => `$ ${l.q}${l.a ? `\n${l.a}` : ""}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function reset() {
    const fresh = freshState();
    stateRef.current = fresh;
    setState(fresh);
    setLines([]);
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

      <div
        className="terminal-body"
        style={{
          minHeight: compact ? 160 : 280,
          maxHeight: compact ? 240 : 420,
          overflow: "auto",
        }}
      >
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
            {l.a ? (
              <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{l.a}</pre>
            ) : null}
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

      <div className="terminal-actions">
        <button type="button" className="btn btn-ghost btn-compact" onClick={reset}>
          Reset environment
        </button>
        <button type="button" className="btn btn-ghost btn-compact" onClick={() => exec("help")}>
          help
        </button>
        <button type="button" className="btn btn-ghost btn-compact" onClick={copyTranscript} disabled={!lines.length}>
          {copied ? "Copied" : "Copy output"}
        </button>
        <span className="terminal-hint">
          <kbd>Tab</kbd> complete · <kbd>↑</kbd> history · <kbd>Ctrl</kbd>+<kbd>L</kbd> clear
        </span>
      </div>
    </div>
  );
}
