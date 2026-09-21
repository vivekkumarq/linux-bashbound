import { useEffect, useRef, useState } from "react";

/**
 * The hero's typing terminal.
 *
 * A scripted transcript that types itself once and then rests. It is decorative
 * but not hidden from assistive tech — the finished transcript is exposed as
 * static text, while the animation itself is marked aria-hidden.
 *
 * With prefers-reduced-motion the whole transcript renders immediately.
 */

type Line = { prompt?: boolean; text: string; tone?: "out" | "ok" };

const SCRIPT: Line[] = [
  { prompt: true, text: "whoami" },
  { text: "learner", tone: "out" },
  { prompt: true, text: "uname -o" },
  { text: "GNU/Linux", tone: "out" },
  { prompt: true, text: "./start-learning.sh" },
  { text: "roadmap loaded · 16 levels", tone: "out" },
  { text: "ready.", tone: "ok" },
];

const TYPE_MS = 45;
const LINE_PAUSE_MS = 320;

export function HeroTerminal() {
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [shown, setShown] = useState(() => (reduced ? SCRIPT.length : 0));
  const [typed, setTyped] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) return undefined;

    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        timers.current.push(id);
      });

    (async () => {
      for (let i = 0; i < SCRIPT.length; i += 1) {
        const line = SCRIPT[i];
        if (cancelled) return;

        if (line.prompt) {
          for (let c = 1; c <= line.text.length; c += 1) {
            if (cancelled) return;
            setTyped(line.text.slice(0, c));
            await wait(TYPE_MS);
          }
          await wait(LINE_PAUSE_MS);
        } else {
          await wait(LINE_PAUSE_MS / 2);
        }

        if (cancelled) return;
        setTyped("");
        setShown(i + 1);
      }
    })();

    return () => {
      cancelled = true;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [reduced]);

  const done = shown >= SCRIPT.length;

  return (
    <div className="hero-term">
      <div className="hero-term-bar" aria-hidden="true">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span className="hero-term-title">learner@bashbound: ~</span>
      </div>

      <div className="hero-term-body" aria-hidden="true">
        {SCRIPT.slice(0, shown).map((line, i) => (
          <div key={i} className={`hero-term-line${line.tone ? ` is-${line.tone}` : ""}`}>
            {line.prompt ? <span className="prompt">$</span> : null}
            <span>{line.text}</span>
          </div>
        ))}

        {!done ? (
          <div className="hero-term-line">
            {SCRIPT[shown]?.prompt ? <span className="prompt">$</span> : null}
            <span>{typed}</span>
            <span className="hero-caret" />
          </div>
        ) : (
          <div className="hero-term-line">
            <span className="prompt">$</span>
            <span className="hero-caret" />
          </div>
        )}
      </div>

      {/* The same content, once, for screen readers. */}
      <p className="visually-hidden">
        Terminal transcript: whoami returns learner. uname dash o returns GNU slash Linux. Running start-learning.sh
        loads a roadmap of 16 levels.
      </p>
    </div>
  );
}
