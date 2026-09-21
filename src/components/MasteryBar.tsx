import { Link } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { topicMastery } from "../lib/learning";

/**
 * Mastery readout for one module.
 *
 * Four independent signals instead of a single "completed" tick, because
 * having read a page is not the same as being able to use it. Each unmet step
 * links to the thing that would satisfy it, so the bar is navigation as well
 * as a score.
 */
export function MasteryBar({ slug }: { slug: string }) {
  const { progress } = useStore();
  const m = topicMastery(slug, progress);

  const steps = [
    { key: "read", label: "Read", done: m.read, hint: "Mark the module read when you finish it.", to: null },
    { key: "practised", label: "Practised", done: m.practiced, hint: "Run the exercises in the sandbox.", to: "/terminal" },
    { key: "quizzed", label: "Quiz passed", done: m.quizzed, hint: "Score 70% or better on a quiz covering this level.", to: "/quizzes" },
    {
      key: "interviewed",
      label: "Interview tested",
      done: m.interviewed,
      hint: "Mark an interview question from this module as known.",
      to: "/interview",
    },
  ] as const;

  return (
    <section className="mastery" aria-label="Mastery for this module">
      <div className="mastery-head">
        <p className="kicker">Mastery</p>
        <span className="mastery-percent">{m.percent}%</span>
      </div>

      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${m.percent}%` }} />
      </div>

      <ul className="mastery-steps">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? "is-done" : ""}>
            <span className="mastery-tick" aria-hidden="true">
              {s.done ? "✓" : "○"}
            </span>
            {s.done || !s.to ? (
              <span className="mastery-label">{s.label}</span>
            ) : (
              <Link className="mastery-label" to={s.to} title={s.hint}>
                {s.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <p className="muted mastery-note">
        {m.percent === 100
          ? "Read, practised, quizzed and tested. This one is yours."
          : steps.find((s) => !s.done)?.hint}
      </p>
    </section>
  );
}
