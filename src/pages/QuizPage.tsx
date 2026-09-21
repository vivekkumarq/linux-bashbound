import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { questions } from "../data/questions";
import { getTopic } from "../data/topics";
import { useStore } from "../hooks/useStore";
import type { InterviewQuestion } from "../types";

/**
 * Quiz engine.
 *
 * Questions are drawn only from the multiple-choice bank. The previous
 * version padded any question into a quiz by attaching three fixed invented
 * wrong answers, which made every such question guessable from the shape of
 * the options alone. A quiz is only worth taking if the distractors are real,
 * so the pool is restricted and the available sizes reflect it honestly.
 */

const SIZES = [10, 25, 50] as const;
type Size = (typeof SIZES)[number];

/** Only questions with authored options can be asked. */
const POOL = questions.filter((q) => q.choices && q.choices.length >= 2);

const CATEGORIES = ["Mixed", ...[...new Set(POOL.map((q) => q.category))].sort()];

function poolFor(category: string) {
  return category === "Mixed" ? POOL : POOL.filter((q) => q.category === category);
}

/** Fisher-Yates, seeded per run so a re-render never reshuffles mid-quiz. */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 16807) % 2147483647;
    const j = Math.floor((state / 2147483647) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Run {
  questions: InterviewQuestion[];
  /** Per-question option order, shuffled once at draw time. */
  order: number[][];
  category: string;
  startedAt: number;
}

export function QuizPage() {
  const { setProgress } = useStore();
  const [size, setSize] = useState<Size>(10);
  const [category, setCategory] = useState("Mixed");
  const [run, setRun] = useState<Run | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<InterviewQuestion[]>([]);
  const recorded = useRef(false);

  const available = useMemo(() => poolFor(category).length, [category]);
  const drawn = Math.min(size, available);

  function start() {
    const seed = Date.now();
    const picks = shuffle(poolFor(category), seed).slice(0, drawn);
    setRun({
      questions: picks,
      order: picks.map((q, qi) => shuffle(q.choices!.map((_, i) => i), seed + qi + 1)),
      category,
      startedAt: Date.now(),
    });
    setIndex(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
    recorded.current = false;
  }

  function answer(optionIndex: number, question: InterviewQuestion) {
    if (picked !== null) return;
    setPicked(optionIndex);
    if (optionIndex === question.correctIndex) setScore((s) => s + 1);
    else setWrong((w) => [...w, question]);
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked(null);
  }

  /* ---- Setup ---- */
  if (!run) {
    return (
      <div className="quiz-setup">
        <p className="kicker">Quiz mode</p>
        <h1>Check your understanding</h1>
        <p className="muted">
          Drawn from the {POOL.length} questions that carry real multiple-choice options. Everything else in the bank
          is written as an open question and lives in the{" "}
          <Link to="/interview">Arena</Link>.
        </p>

        <fieldset className="quiz-field">
          <legend>Length</legend>
          <div className="row">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className="chip-btn"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
              >
                {s} questions
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="quiz-field">
          <legend>Topic</legend>
          <div className="row">
            {CATEGORIES.map((c) => {
              const n = poolFor(c).length;
              return (
                <button
                  key={c}
                  type="button"
                  className="chip-btn"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c} <span className="chip-count">{n}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {drawn < size ? (
          <p className="callout quiz-note">
            {category} has {available} multiple-choice question{available === 1 ? "" : "s"} available, so this run will
            be {drawn} long rather than {size}. More are being written.
          </p>
        ) : null}

        <button className="btn btn-primary quiz-start" onClick={start} disabled={drawn === 0}>
          Start {drawn} question{drawn === 1 ? "" : "s"}
        </button>
      </div>
    );
  }

  /* ---- Results ---- */
  if (index >= run.questions.length) {
    const total = run.questions.length;
    const accuracy = total ? Math.round((score / total) * 100) : 0;
    const seconds = Math.round((Date.now() - run.startedAt) / 1000);
    const weakAreas = [...new Set(wrong.map((q) => q.category))];
    const reviewTopics = [...new Set(wrong.flatMap((q) => q.relatedTopics))]
      .map((slug) => getTopic(slug))
      .filter(Boolean)
      .slice(0, 6);

    if (!recorded.current) {
      recorded.current = true;
      setProgress((p) => ({
        ...p,
        quizHistory: [
          ...p.quizHistory,
          {
            at: Date.now(),
            category: run.category,
            score,
            total,
            seconds,
            weak: weakAreas,
            topics: [...new Set(run.questions.flatMap((q) => q.relatedTopics))],
          },
        ].slice(-60),
      }));
    }

    return (
      <div className="quiz-results">
        <p className="kicker">{run.category}</p>
        <h1>
          {score} / {total}
        </h1>
        <p className="mono-meta muted">
          <span>{accuracy}% accuracy</span>
          <span>
            {Math.floor(seconds / 60)}m {seconds % 60}s
          </span>
          <span>{Math.round(seconds / Math.max(total, 1))}s per question</span>
        </p>

        {weakAreas.length ? (
          <>
            <h2>Weak areas</h2>
            <p className="related-row">
              {weakAreas.map((a) => (
                <span key={a} className="badge">
                  {a}
                </span>
              ))}
            </p>
          </>
        ) : (
          <p className="callout ok-note">Nothing missed. Try a longer run, or a category you have not touched.</p>
        )}

        {reviewTopics.length ? (
          <>
            <h2>Review these modules</h2>
            <ul className="topic-list">
              {reviewTopics.map((t) => (
                <li key={t!.slug}>
                  <Link to={`/learn/${t!.slug}`} className="topic-row">
                    <span className="topic-row-main">
                      <span className="topic-row-title">{t!.title}</span>
                      <span className="muted topic-row-summary">{t!.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {wrong.length ? (
          <>
            <h2>What you missed</h2>
            <ul className="quiz-review">
              {wrong.map((q) => (
                <li key={q.id}>
                  <p className="quiz-review-q">{q.question}</p>
                  <p className="quiz-review-a">
                    <strong>{q.answer}</strong>
                  </p>
                  <p className="muted">{q.explanation}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="row quiz-again">
          <button className="btn btn-primary" onClick={() => setRun(null)}>
            Another quiz
          </button>
          <Link className="btn btn-secondary" to="/interview">
            Open the Arena
          </Link>
          <Link className="btn btn-ghost" to="/progress">
            See my progress
          </Link>
        </div>
      </div>
    );
  }

  /* ---- A question ---- */
  const question = run.questions[index];
  const order = run.order[index];

  return (
    <div className="quiz-run">
      <div className="quiz-progress">
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${(index / run.questions.length) * 100}%` }} />
        </div>
        <p className="mono-meta muted">
          <span>
            {index + 1} of {run.questions.length}
          </span>
          <span>{question.category}</span>
          <span>{question.difficulty}</span>
          <span>score {score}</span>
        </p>
      </div>

      <h2 className="quiz-question">{question.question}</h2>

      <div className="quiz-choices" role="radiogroup" aria-label="Answer options">
        {order.map((optionIndex, position) => {
          const isCorrect = optionIndex === question.correctIndex;
          let cls = "quiz-choice";
          if (picked !== null) {
            if (isCorrect) cls += " correct";
            else if (optionIndex === picked) cls += " wrong";
          }
          return (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={picked === optionIndex}
              className={cls}
              disabled={picked !== null}
              onClick={() => answer(optionIndex, question)}
            >
              <span className="quiz-choice-key">{String.fromCharCode(65 + position)}</span>
              {question.choices![optionIndex]}
            </button>
          );
        })}
      </div>

      {picked !== null ? (
        <div className="quiz-explain">
          <p className={picked === question.correctIndex ? "quiz-verdict ok" : "quiz-verdict no"}>
            {picked === question.correctIndex ? "Correct" : `Not quite — ${question.answer}`}
          </p>
          <p className="muted">{question.explanation}</p>
          <button className="btn btn-primary" onClick={next}>
            {index + 1 >= run.questions.length ? "See results" : "Continue"}
          </button>
        </div>
      ) : null}

      <button className="btn btn-ghost quiz-quit" onClick={() => setRun(null)}>
        End this quiz
      </button>
    </div>
  );
}
