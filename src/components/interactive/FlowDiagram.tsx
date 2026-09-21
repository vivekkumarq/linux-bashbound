import { useEffect, useRef, useState } from "react";
import { flows } from "../../data/flows";
import { CodeBlock } from "../CodeBlock";
import { extractRunnable, usePalette } from "../../lib/paletteContext";

/**
 * The "under the hood" explainer.
 *
 * A flow is a chain of layers; selecting one explains it. Play walks the chain
 * so the order is visible, which is the part a static list of bullet points
 * never conveys. Everything is keyboard reachable and the rail is a real
 * tablist, so arrow keys work.
 */
export function FlowDiagram({ id }: { id: keyof typeof flows | string }) {
  const flow = flows[id];
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const pal = usePalette();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!playing || !flow) return undefined;
    const timer = window.setInterval(() => {
      setActive((i) => {
        if (i >= flow.steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1900);
    return () => window.clearInterval(timer);
  }, [playing, flow]);

  if (!flow) return null;
  const step = flow.steps[active];

  function onKeyDown(event: React.KeyboardEvent) {
    const last = flow.steps.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = active === last ? 0 : active + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = active === 0 ? last : active - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setPlaying(false);
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section className="flow" aria-label={flow.title}>
      <header className="flow-head">
        <div>
          <p className="kicker">Under the hood</p>
          <h3>{flow.title}</h3>
          <p className="muted flow-intro">{flow.intro}</p>
        </div>
        {!reduced ? (
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              setActive(0);
              setPlaying(true);
            }}
          >
            {playing ? "Pause" : "Play the flow"}
          </button>
        ) : null}
      </header>

      <div className="flow-rail" role="tablist" aria-orientation="horizontal" onKeyDown={onKeyDown}>
        {flow.steps.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`flow-${flow.id}-tab-${s.id}`}
            aria-selected={i === active}
            aria-controls={`flow-${flow.id}-panel`}
            tabIndex={i === active ? 0 : -1}
            className={`flow-step${i === active ? " is-active" : ""}${i < active ? " is-past" : ""}`}
            onClick={() => {
              setPlaying(false);
              setActive(i);
            }}
          >
            <span className="flow-step-index">{i + 1}</span>
            <span className="flow-step-label">{s.label}</span>
            <span className="flow-step-caption">{s.caption}</span>
          </button>
        ))}
      </div>

      <div
        className="flow-panel"
        id={`flow-${flow.id}-panel`}
        role="tabpanel"
        aria-labelledby={`flow-${flow.id}-tab-${step.id}`}
        tabIndex={0}
      >
        <h4>{step.label}</h4>
        <p>{step.detail}</p>
        {step.code ? <CodeBlock code={step.code} onTry={(code) => pal.openBash(extractRunnable(code))} /> : null}
      </div>

      <p className="flow-takeaway">
        <strong>The point. </strong>
        {flow.takeaway}
      </p>
    </section>
  );
}
