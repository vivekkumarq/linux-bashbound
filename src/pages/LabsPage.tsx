import { useState } from "react";
import { labs } from "../data/labs";

export function LabsPage() {
  const [id, setId] = useState(labs[0].id);
  const lab = labs.find((l) => l.id === id)!;
  const [step, setStep] = useState(lab.start);
  const node = lab.steps[step];
  const done = !node.options.length;

  return (
    <div>
      <p className="kicker">Troubleshooting lab</p>
      <h1>Incident paths</h1>
      <p className="muted">Choose the next command. There is a professional order of operations — not a single trivia answer.</p>
      <div className="row">
        {labs.map((l) => (
          <button
            key={l.id}
            className="badge"
            onClick={() => {
              setId(l.id);
              setStep(l.start);
            }}
          >
            {l.title}
          </button>
        ))}
      </div>
      <article className="card" style={{ marginTop: 20 }}>
        <div className="callout danger">{lab.alert}</div>
        <p>{lab.symptom}</p>
        <p className="muted">Goal: {lab.goal}</p>
        <h2>{node.prompt}</h2>
        <div className="stack">
          {node.options.map((o) => (
            <button
              key={o.id}
              className="quiz-choice"
              onClick={() => {
                setStep(o.next);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        {done ? <p style={{ marginTop: 16 }}>{lab.resolution}</p> : null}
      </article>
    </div>
  );
}
