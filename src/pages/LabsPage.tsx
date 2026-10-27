import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { labs } from "../data/labs";

export function LabsPage() {
  // The lab lives in the URL, so /troubleshooting/oom opens the OOM lab and a
  // lab can be linked to. Changing lab changes the path, which starts it fresh.
  const { id } = useParams();
  const lab = labs.find((l) => l.id === id) ?? labs[0];
  const [step, setStep] = useState(lab.start);
  // What the last choice taught: every option carries a note saying why it
  // is right or wrong, and a weak choice can still lead on to the next step.
  const [last, setLast] = useState<{ label: string; note: string } | null>(null);
  const node = lab.steps[step];
  const done = !node.options.length;

  return (
    <div>
      <p className="kicker">Troubleshooting lab</p>
      <h1>Incident paths</h1>
      <p className="muted">Choose the next command. There is a professional order of operations — not a single trivia answer.</p>
      <div className="row">
        {labs.map((l) => (
          <Link
            key={l.id}
            className="badge"
            to={`/troubleshooting/${l.id}`}
            aria-current={l.id === lab.id ? "page" : undefined}
            // Picking the lab you are in starts it again.
            onClick={() => {
              if (l.id !== lab.id) return;
              setStep(l.start);
              setLast(null);
            }}
          >
            {l.title}
          </Link>
        ))}
      </div>
      <article className="card" style={{ marginTop: 20 }}>
        <div className="callout danger">{lab.alert}</div>
        <p>{lab.symptom}</p>
        <p className="muted">Goal: {lab.goal}</p>
        <div aria-live="polite">
          {last ? (
            <p className="callout">
              <strong>
                <code>{last.label}</code>
              </strong>{" "}
              — {last.note}
            </p>
          ) : null}
        </div>
        <h2>{node.prompt}</h2>
        <div className="stack">
          {node.options.map((o, i) => (
            <button
              key={o.id}
              className="quiz-choice"
              onClick={() => {
                setStep(o.next);
                setLast({ label: o.label, note: o.note });
              }}
            >
              {/* .quiz-choice is a two-column grid: a letter, then the text.
                  A bare label landed in the 26px letter column and wrapped
                  one word per line. */}
              <span className="quiz-choice-key">{String.fromCharCode(65 + i)}</span>
              <code>{o.label}</code>
            </button>
          ))}
        </div>
        {done ? <p style={{ marginTop: 16 }}>{lab.resolution}</p> : null}
      </article>
    </div>
  );
}
