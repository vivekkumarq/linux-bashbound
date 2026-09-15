import { useState } from "react";
import { challengeForDate, challenges } from "../data/challenges";
import { useStore } from "../hooks/useStore";
import { todayKey } from "../utils/storage";
import { CodeBlock } from "../components/CodeBlock";

export function ChallengesPage() {
  const today = challengeForDate();
  const [id, setId] = useState(today.id);
  const ch = challenges.find((c) => c.id === id)!;
  const [hint, setHint] = useState(0);
  const [show, setShow] = useState(false);
  const { progress, setProgress } = useStore();
  const done = progress.challengeDays.includes(todayKey());

  return (
    <div>
      <p className="kicker">Daily Linux Challenge</p>
      <h1>{ch.title}</h1>
      <p className={`badge ${ch.difficulty.toLowerCase()}`}>{ch.difficulty}</p>
      <p style={{ fontSize: 20 }}>{ch.prompt}</p>
      <div className="row">
        <button className="btn btn-ghost" onClick={() => setHint((h) => Math.min(ch.hints.length, h + 1))}>
          Hint
        </button>
        <button className="btn btn-ghost" onClick={() => setShow(true)}>
          Expected approach
        </button>
        <button className="btn btn-secondary" onClick={() => setShow(true)}>
          Reveal solution
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            setProgress((p) => ({
              ...p,
              challengeDays: p.challengeDays.includes(todayKey()) ? p.challengeDays : [...p.challengeDays, todayKey()],
            }))
          }
        >
          {done ? "Logged for today" : "I solved today’s"}
        </button>
      </div>
      {hint > 0 ? (
        <ul>
          {ch.hints.slice(0, hint).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">Hints stay hidden until you ask.</p>
      )}
      {show ? (
        <div className="card">
          <p>{ch.approach}</p>
          <CodeBlock code={ch.solution} />
        </div>
      ) : null}
      <h2>Archive</h2>
      <div className="row">
        {challenges.map((c) => (
          <button key={c.id} className="badge" onClick={() => { setId(c.id); setHint(0); setShow(false); }}>
            {c.title}
          </button>
        ))}
      </div>
    </div>
  );
}
