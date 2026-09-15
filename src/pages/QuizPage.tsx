import { useEffect, useMemo, useState } from "react";
import { questions } from "../data/questions";
import { useStore } from "../hooks/useStore";

const sizes = [10, 25, 50] as const;
const cats = ["Mixed", "Linux Fundamentals", "Bash", "Networking", "Processes", "Security"];

export function QuizPage() {
  const { setProgress } = useStore();
  const [count, setCount] = useState<(typeof sizes)[number]>(10);
  const [cat, setCat] = useState("Mixed");
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [weak, setWeak] = useState<string[]>([]);
  const [choices, setChoices] = useState<{ c: string; ok: boolean }[]>([]);

  const setQ = useMemo(() => {
    const pool =
      cat === "Mixed" ? questions : questions.filter((q) => q.category === cat || q.tags.includes(cat.toLowerCase()));
    return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  }, [started, count, cat]);

  useEffect(() => {
    const q = setQ[i];
    if (!q) return;
    const base =
      q.choices && q.choices.length
        ? q.choices.map((c, idx) => ({ c, ok: idx === (q.correctIndex ?? 0) }))
        : [
            { c: q.answer, ok: true },
            { c: "This is always a kernel panic.", ok: false },
            { c: "Disable SELinux permanently as the first fix.", ok: false },
            { c: "chmod 777 / to restore access.", ok: false },
          ];
    setChoices([...base].sort(() => Math.random() - 0.5));
  }, [setQ, i]);

  if (!started) {
    return (
      <div>
        <p className="kicker">Quiz mode</p>
        <h1>Check your understanding</h1>
        <div className="row">
          {sizes.map((s) => (
            <button key={s} className="btn btn-ghost" onClick={() => setCount(s)}>
              {s} questions {count === s ? "✓" : ""}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {cats.map((c) => (
            <button key={c} className="badge" onClick={() => setCat(c)}>
              {c} {cat === c ? "✓" : ""}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setStarted(true)}>
          Start
        </button>
      </div>
    );
  }

  if (i >= setQ.length) {
    const accuracy = Math.round((score / Math.max(setQ.length, 1)) * 100);
    return (
      <div className="card">
        <h1>
          Score {score}/{setQ.length}
        </h1>
        <p>Accuracy {accuracy}%</p>
        <p>Weak areas: {weak.length ? [...new Set(weak)].join(", ") : "none spotted — keep drilling advanced topics."}</p>
        <p className="muted">Recommended: open the roadmap modules matching those categories.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            setStarted(false);
            setI(0);
            setScore(0);
            setWeak([]);
          }}
        >
          Again
        </button>
      </div>
    );
  }

  const q = setQ[i];

  function answer(_idx: number, ok: boolean) {
    if (picked !== null) return;
    setPicked(_idx);
    if (ok) setScore((s) => s + 1);
    else setWeak((w) => [...w, q.category]);
  }

  function next() {
    const last = i + 1 >= setQ.length;
    if (last) {
      const finalScore = score;
      setProgress((p) => ({
        ...p,
        quizHistory: [
          ...p.quizHistory,
          { at: Date.now(), category: cat, score: finalScore, total: setQ.length, weak: [...new Set(weak)] },
        ],
      }));
    }
    setI((x) => x + 1);
    setPicked(null);
  }

  return (
    <div>
      <p className="muted">
        {i + 1} / {setQ.length} · {q.difficulty} · {q.category}
      </p>
      <h2>{q.question}</h2>
      <div className="stack">
        {choices.map((opt, idx) => {
          let cls = "quiz-choice";
          if (picked !== null) {
            if (opt.ok) cls += " correct";
            else if (idx === picked) cls += " wrong";
          }
          return (
            <button key={opt.c} className={cls} onClick={() => answer(idx, opt.ok)}>
              {opt.c}
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <div style={{ marginTop: 16 }}>
          <p>{q.explanation}</p>
          <button className="btn btn-primary" onClick={next}>
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
