import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { questionCategories, questions } from "../data/questions";
import { getTopic } from "../data/topics";
import { useStore } from "../hooks/useStore";

export function InterviewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { progress, setProgress } = useStore();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [diff, setDiff] = useState("All");
  const [os, setOs] = useState("All");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return questions.filter((item) => {
      if (cat !== "All" && item.category !== cat) return false;
      if (diff !== "All" && item.difficulty !== diff) return false;
      if (os !== "All" && !item.operatingSystem.includes(os as "Linux")) return false;
      if (onlyBookmarked && !progress.bookmarkedQuestions.includes(item.id)) return false;
      if (q.trim()) {
        const hay = `${item.question} ${item.tags.join(" ")} ${item.answer}`.toLowerCase();
        if (!q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [q, cat, diff, os, onlyBookmarked, progress.bookmarkedQuestions]);

  const currentId = id ? Number(id) : filtered[0]?.id;
  const idx = filtered.findIndex((x) => x.id === currentId);
  const item = filtered[idx] ?? filtered[0];

  // Reset the per-question UI whenever the question changes.
  useEffect(() => {
    setReveal(false);
    setPicked(null);
  }, [item?.id]);

  // ?random=1 (the "r" shortcut) jumps to a random question, then drops the
  // parameter so a refresh does not keep re-rolling.
  useEffect(() => {
    if (params.get("random") !== "1" || filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setParams({}, { replace: true });
    if (pick) nav(`/interview/${pick.id}`, { replace: true });
  }, [params, filtered, nav, setParams]);

  function go(delta: number) {
    const n = filtered[idx + delta];
    if (n) nav(`/interview/${n.id}`);
  }

  function randomQ() {
    const n = filtered[Math.floor(Math.random() * filtered.length)];
    if (n) nav(`/interview/${n.id}`);
  }

  if (!item) {
    return (
      <div>
        <h1>Interview Arena</h1>
        <p className="muted">No questions match those filters.</p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setQ("");
            setCat("All");
            setDiff("All");
            setOs("All");
            setOnlyBookmarked(false);
          }}
        >
          Clear filters
        </button>
      </div>
    );
  }

  const bookmarked = progress.bookmarkedQuestions.includes(item.id);
  const mastered = progress.masteredQuestions.includes(item.id);
  const isMcq = Boolean(item.choices?.length);

  function toggleBookmark() {
    setProgress((p) => ({
      ...p,
      bookmarkedQuestions: bookmarked
        ? p.bookmarkedQuestions.filter((x) => x !== item.id)
        : [...p.bookmarkedQuestions, item.id],
    }));
  }

  // Marking a question known also credits the modules it relates to, which is
  // what the "interview tested" step of module mastery reads.
  function toggleMastered() {
    setProgress((p) => {
      const nowMastered = !mastered;
      const stillMastered = nowMastered
        ? [...p.masteredQuestions, item.id]
        : p.masteredQuestions.filter((x) => x !== item.id);

      const credited = new Set(p.interviewedTopics);
      if (nowMastered) {
        item.relatedTopics.filter((slug) => getTopic(slug)).forEach((slug) => credited.add(slug));
      }

      return {
        ...p,
        masteredQuestions: stillMastered,
        interviewedTopics: [...credited],
        seenQuestions: p.seenQuestions.includes(item.id) ? p.seenQuestions : [...p.seenQuestions, item.id],
      };
    });
  }

  function choose(i: number) {
    setPicked(i);
    setReveal(true);
    setProgress((p) => ({
      ...p,
      seenQuestions: p.seenQuestions.includes(item.id) ? p.seenQuestions : [...p.seenQuestions, item.id],
    }));
  }

  const relatedLessons = item.relatedTopics.map((slug) => getTopic(slug)).filter(Boolean);

  return (
    <div className="arena">
      <header className="arena-head">
        <p className="kicker">Linux Interview Arena</p>
        <h1>Question #{item.id}</h1>
        <p className="muted mono-meta">
          <span>
            {idx + 1} of {filtered.length} in view
          </span>
          <span>{questions.length.toLocaleString()} in the bank</span>
          <span>{progress.masteredQuestions.length} marked known</span>
        </p>
      </header>

      <div className="filters">
        <input
          className="input"
          placeholder="Search questions, tags, answers"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option>All</option>
          {questionCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="select" value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty">
          {["All", "Beginner", "Intermediate", "Advanced", "Expert"].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="row arena-filters">
        {["All", "Linux", "Unix", "Bash", "POSIX"].map((o) => (
          <button
            key={o}
            type="button"
            className="badge"
            aria-pressed={os === o}
            onClick={() => setOs(o)}
          >
            {o}
          </button>
        ))}
        <button
          type="button"
          className="badge"
          aria-pressed={onlyBookmarked}
          onClick={() => setOnlyBookmarked((v) => !v)}
        >
          Bookmarked ({progress.bookmarkedQuestions.length})
        </button>
        <button type="button" className="btn btn-ghost btn-compact" onClick={randomQ}>
          Random
        </button>
      </div>

      <article className="arena-card">
        <div className="row arena-tags">
          <span className={`badge ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
          <span className="badge">{item.category}</span>
          <span className="badge">{item.type}</span>
          {item.tags.slice(0, 5).map((t) => (
            <span key={t} className="badge">
              {t}
            </span>
          ))}
        </div>

        <p className="arena-question">{item.question}</p>

        {isMcq ? (
          <ul className="arena-choices" role="radiogroup" aria-label="Answer options">
            {item.choices!.map((c, i) => {
              const isCorrect = i === item.correctIndex;
              const state = picked === null ? "" : isCorrect ? " is-correct" : picked === i ? " is-wrong" : "";
              return (
                <li key={c}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={picked === i}
                    className={`arena-choice${state}`}
                    disabled={picked !== null}
                    onClick={() => choose(i)}
                  >
                    <span className="arena-choice-key">{String.fromCharCode(65 + i)}</span>
                    <span>{c}</span>
                    {picked !== null && isCorrect ? <span className="arena-choice-mark">correct</span> : null}
                    {picked === i && !isCorrect ? <span className="arena-choice-mark">your answer</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="row arena-actions">
          {!isMcq || picked !== null ? (
            <button className="btn btn-primary" onClick={() => setReveal((r) => !r)}>
              {reveal ? "Hide answer" : "Reveal answer"}
            </button>
          ) : (
            <span className="muted arena-prompt">Pick an option to see the answer.</span>
          )}
          <button className="btn btn-ghost" onClick={toggleBookmark} aria-pressed={bookmarked}>
            {bookmarked ? "Bookmarked ✓" : "Bookmark"}
          </button>
          <button className="btn btn-ghost" onClick={toggleMastered} aria-pressed={mastered}>
            {mastered ? "Known ✓" : "I know this"}
          </button>
        </div>

        {reveal ? (
          <div className="arena-answer">
            <h3>Answer</h3>
            <p>{item.answer}</p>
            <h3>Explanation</h3>
            <p className="muted">{item.explanation}</p>
            {item.example ? (
              <>
                <h3>Example</h3>
                <pre className="codeblock arena-example">{item.example}</pre>
              </>
            ) : null}
            {relatedLessons.length ? (
              <>
                <h3>Study this next</h3>
                <p className="related-row">
                  {relatedLessons.map((t) => (
                    <Link key={t!.slug} className="badge related-link" to={`/learn/${t!.slug}`}>
                      {t!.title}
                    </Link>
                  ))}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </article>

      <nav className="row arena-nav" aria-label="Question navigation">
        <button className="btn btn-secondary" onClick={() => go(-1)} disabled={idx <= 0}>
          Previous
        </button>
        <button className="btn btn-secondary" onClick={() => go(1)} disabled={idx >= filtered.length - 1}>
          Next
        </button>
        <Link className="btn btn-ghost" to="/quizzes">
          Take a timed quiz instead
        </Link>
      </nav>
    </div>
  );
}
