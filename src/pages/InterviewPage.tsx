import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { questionCategories, questions } from "../data/questions";
import { useStore } from "../hooks/useStore";
import type { Difficulty } from "../types";

export function InterviewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { progress, setProgress } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [diff, setDiff] = useState("All");
  const [os, setOs] = useState("All");
  const [reveal, setReveal] = useState(false);

  const filtered = useMemo(() => {
    return questions.filter((item) => {
      if (cat !== "All" && item.category !== cat) return false;
      if (diff !== "All" && item.difficulty !== diff) return false;
      if (os !== "All" && !item.operatingSystem.includes(os as "Linux")) return false;
      if (q.trim()) {
        const hay = `${item.question} ${item.tags.join(" ")} ${item.answer}`.toLowerCase();
        if (!q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [q, cat, diff, os]);

  const currentId = id ? Number(id) : filtered[0]?.id;
  const idx = filtered.findIndex((x) => x.id === currentId);
  const item = filtered[idx] ?? filtered[0];

  function go(delta: number) {
    const n = filtered[idx + delta];
    if (n) {
      setReveal(false);
      nav(`/interview/${n.id}`);
    }
  }

  function randomQ() {
    const n = filtered[Math.floor(Math.random() * filtered.length)];
    if (n) {
      setReveal(false);
      nav(`/interview/${n.id}`);
    }
  }

  if (!item) return <p>No questions match those filters.</p>;

  const bookmarked = progress.bookmarkedQuestions.includes(item.id);
  const mastered = progress.masteredQuestions.includes(item.id);

  return (
    <div>
      <p className="kicker">Linux Interview Arena</p>
      <h1>Question #{item.id}</h1>
      <p className="muted">
        {idx + 1} / {filtered.length} in view · {questions.length} in the bank
      </p>
      <div className="filters">
        <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option>All</option>
          {questionCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="select" value={diff} onChange={(e) => setDiff(e.target.value)}>
          {["All", "Beginner", "Intermediate", "Advanced", "Expert"].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="row">
        {["All", "Linux", "Unix", "Bash", "POSIX"].map((o) => (
          <button key={o} className={`badge ${os === o ? "active" : ""}`} onClick={() => setOs(o)}>
            {o}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={randomQ}>
          Random
        </button>
      </div>

      <article className="card" style={{ marginTop: 18 }}>
        <div className="row">
          <span className={`badge ${item.difficulty.toLowerCase()}`}>{item.difficulty as Difficulty}</span>
          <span className="badge">{item.category}</span>
          <span className="badge">{item.type}</span>
          {item.tags.map((t) => (
            <span key={t} className="badge">
              {t}
            </span>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-interview)", fontSize: 22, marginTop: 16 }}>{item.question}</p>
        {item.choices?.length ? (
          <ul>
            {item.choices.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
        <div className="row">
          <button className="btn btn-primary" onClick={() => setReveal((r) => !r)}>
            {reveal ? "Hide answer" : "Reveal answer"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() =>
              setProgress((p) => ({
                ...p,
                bookmarkedQuestions: bookmarked
                  ? p.bookmarkedQuestions.filter((x) => x !== item.id)
                  : [...p.bookmarkedQuestions, item.id],
              }))
            }
          >
            {bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() =>
              setProgress((p) => ({
                ...p,
                masteredQuestions: mastered
                  ? p.masteredQuestions.filter((x) => x !== item.id)
                  : [...p.masteredQuestions, item.id],
                seenQuestions: p.seenQuestions.includes(item.id) ? p.seenQuestions : [...p.seenQuestions, item.id],
              }))
            }
          >
            {mastered ? "Mastered" : "Mark mastered"}
          </button>
        </div>
        {reveal ? (
          <div style={{ marginTop: 16 }}>
            <h3>Answer</h3>
            <p>{item.answer}</p>
            <h3>Explanation</h3>
            <p className="muted">{item.explanation}</p>
            {item.example ? (
              <>
                <h3>Example</h3>
                <pre className="codeblock" style={{ padding: 12 }}>
                  {item.example}
                </pre>
              </>
            ) : null}
          </div>
        ) : null}
      </article>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-secondary" onClick={() => go(-1)} disabled={idx <= 0}>
          Previous
        </button>
        <button className="btn btn-secondary" onClick={() => go(1)} disabled={idx >= filtered.length - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
