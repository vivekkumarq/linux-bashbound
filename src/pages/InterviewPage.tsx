import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { questions } from "../data/questions";
import { getTopic } from "../data/topics";
import { useStore } from "../hooks/useStore";
import { CategoryIcon } from "../components/ArenaIcons";
import type { InterviewQuestion } from "../types";

/**
 * The Interview Arena.
 *
 * Browse-first rather than one-question-at-a-time: pick a topic on the left,
 * read the whole list on the right, open any question in place. Paging through
 * 1,300 questions with a Next button was the wrong shape for a reference.
 *
 * Every filter from the previous version is still here — search, category,
 * difficulty, OS family, bookmarks — plus a random jump and deep links to a
 * single question at /interview/:id.
 */

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced", "Expert"] as const;
const FAMILIES = ["All", "Linux", "Unix", "Bash", "POSIX"] as const;
const PAGE = 25;

/** Category list with counts, biggest first — the sidebar's source. */
const CATEGORY_COUNTS = (() => {
  const counts = new Map<string, number>();
  for (const q of questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
})();

export function InterviewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { progress, setProgress } = useStore();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("All");
  const [family, setFamily] = useState<string>("All");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [hideKnown, setHideKnown] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [openId, setOpenId] = useState<number | null>(id ? Number(id) : null);
  const [limit, setLimit] = useState(PAGE);

  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return questions.filter((q) => {
      if (category && q.category !== category) return false;
      if (difficulty !== "All" && q.difficulty !== difficulty) return false;
      if (family !== "All" && !q.operatingSystem.includes(family as "Linux")) return false;
      if (onlyBookmarked && !progress.bookmarkedQuestions.includes(q.id)) return false;
      if (hideKnown && progress.masteredQuestions.includes(q.id)) return false;
      if (terms.length) {
        const hay = `${q.question} ${q.tags.join(" ")} ${q.answer} ${q.category}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [query, category, difficulty, family, onlyBookmarked, hideKnown, progress.bookmarkedQuestions, progress.masteredQuestions]);

  // Reset paging whenever the result set changes underneath us.
  useEffect(() => {
    setLimit(PAGE);
  }, [query, category, difficulty, family, onlyBookmarked, hideKnown]);

  // A deep link or a random jump must be reachable: widen the page until the
  // target is rendered, then scroll to it.
  useEffect(() => {
    if (openId === null) return;
    const index = filtered.findIndex((q) => q.id === openId);
    if (index === -1) return;
    if (index >= limit) setLimit(Math.ceil((index + 1) / PAGE) * PAGE);
    const node = document.getElementById(`q-${openId}`);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, filtered, limit]);

  useEffect(() => {
    if (id) setOpenId(Number(id));
  }, [id]);

  // ?random=1 arrives from the "r" shortcut.
  useEffect(() => {
    if (params.get("random") !== "1" || filtered.length === 0) return;
    setParams({}, { replace: true });
    setOpenId(filtered[Math.floor(Math.random() * filtered.length)].id);
  }, [params, filtered, setParams]);

  function pickRandom() {
    if (!filtered.length) return;
    setOpenId(filtered[Math.floor(Math.random() * filtered.length)].id);
  }

  function chooseCategory(name: string | null) {
    setCategory(name);
    setNavOpen(false);
    listRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const knownInView = filtered.filter((q) => progress.masteredQuestions.includes(q.id)).length;
  const heading = category ?? "All questions";

  return (
    <div className="arena">
      <header className="arena-hero">
        <div className="arena-hero-grid" aria-hidden="true" />
        <div className="arena-hero-glyphs" aria-hidden="true">
          <span>$</span>
          <span>~</span>
          <span>|</span>
          <span>&gt;</span>
          <span>/</span>
          <span>#</span>
        </div>
        <div className="arena-hero-body">
          <p className="kicker">Linux Interview Arena</p>
          <h1>Read the whole topic, not one card at a time</h1>
          <p className="muted arena-hero-copy">
            {questions.length.toLocaleString()} questions across {CATEGORY_COUNTS.length} topics. Pick a topic, open
            any question in place, and mark what you already know.
          </p>
          <div className="arena-hero-stats">
            <span>
              <strong>{progress.masteredQuestions.length}</strong> known
            </span>
            <span>
              <strong>{progress.bookmarkedQuestions.length}</strong> bookmarked
            </span>
            <span>
              <strong>{filtered.length.toLocaleString()}</strong> in view
            </span>
          </div>
        </div>
      </header>

      <div className="arena-shell">
        <button
          type="button"
          className="arena-nav-toggle"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <CategoryIcon name={category ?? "Linux Fundamentals"} />
          {heading}
          <span className="arena-nav-toggle-count">{filtered.length}</span>
        </button>

        <aside className={`arena-side${navOpen ? " is-open" : ""}`} aria-label="Filters and topics">
          <div className="arena-search">
            <input
              type="search"
              placeholder="Search questions, tags, answers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search questions"
            />
          </div>

          <section className="arena-filter">
            <p className="arena-filter-label">Difficulty</p>
            <div className="arena-chips">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`arena-chip d-${d.toLowerCase()}`}
                  aria-pressed={difficulty === d}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </section>

          <section className="arena-filter">
            <p className="arena-filter-label">Family</p>
            <div className="arena-chips">
              {FAMILIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="arena-chip"
                  aria-pressed={family === f}
                  onClick={() => setFamily(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </section>

          <section className="arena-filter">
            <p className="arena-filter-label">Show</p>
            <div className="arena-chips">
              <button
                type="button"
                className="arena-chip"
                aria-pressed={onlyBookmarked}
                onClick={() => setOnlyBookmarked((v) => !v)}
              >
                Bookmarked ({progress.bookmarkedQuestions.length})
              </button>
              <button type="button" className="arena-chip" aria-pressed={hideKnown} onClick={() => setHideKnown((v) => !v)}>
                Hide known
              </button>
            </div>
          </section>

          <nav className="arena-topics" aria-label="Topics">
            <p className="arena-filter-label">Topics</p>

            <button
              type="button"
              className={`arena-topic${category === null ? " is-active" : ""}`}
              onClick={() => chooseCategory(null)}
            >
              <span className="arena-topic-icon">
                <CategoryIcon name="Linux Fundamentals" />
              </span>
              <span className="arena-topic-name">All questions</span>
              <span className="arena-topic-count">{questions.length}</span>
            </button>

            {CATEGORY_COUNTS.map(({ name, count }) => {
              const known = questions.filter(
                (q) => q.category === name && progress.masteredQuestions.includes(q.id),
              ).length;
              const pct = count ? Math.round((known / count) * 100) : 0;
              const isOpen = expandedNav === name;

              return (
                <div key={name} className={`arena-topic-group${isOpen ? " is-expanded" : ""}`}>
                  {/* Two sibling buttons rather than one nested inside the
                      other: selecting the topic and expanding its breakdown
                      are separate actions, and a button inside a button is
                      invalid. */}
                  <div className="arena-topic-row">
                    <button
                      type="button"
                      className={`arena-topic${category === name ? " is-active" : ""}`}
                      onClick={() => chooseCategory(name)}
                    >
                      <span className="arena-topic-icon">
                        <CategoryIcon name={name} />
                      </span>
                      <span className="arena-topic-name">{name}</span>
                      <span className="arena-topic-count">{count}</span>
                      {known > 0 ? (
                        <span className="arena-topic-bar" aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="arena-topic-more"
                      aria-label={`${isOpen ? "Hide" : "Show"} difficulty breakdown for ${name}`}
                      aria-expanded={isOpen}
                      onClick={() => setExpandedNav(isOpen ? null : name)}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 9l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="arena-subfilters">
                      {DIFFICULTIES.filter((d) => d !== "All").map((d) => {
                        const n = questions.filter((q) => q.category === name && q.difficulty === d).length;
                        if (!n) return null;
                        return (
                          <button
                            key={d}
                            type="button"
                            className={`arena-subfilter d-${d.toLowerCase()}`}
                            onClick={() => {
                              setCategory(name);
                              setDifficulty(d);
                              setNavOpen(false);
                            }}
                          >
                            {d}
                            <span>{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="arena-main">
          <div className="arena-main-head">
            <div>
              <h2 className="arena-heading">
                <CategoryIcon name={category ?? "Linux Fundamentals"} size={20} />
                {heading}
              </h2>
              <p className="mono-meta muted">
                <span>{filtered.length.toLocaleString()} questions</span>
                <span>{knownInView} known</span>
                {difficulty !== "All" ? <span>{difficulty}</span> : null}
                {family !== "All" ? <span>{family}</span> : null}
              </p>
            </div>
            <div className="arena-main-actions">
              <button type="button" className="btn btn-ghost btn-compact" onClick={pickRandom}>
                Random
              </button>
              {openId !== null ? (
                <button type="button" className="btn btn-ghost btn-compact" onClick={() => setOpenId(null)}>
                  Collapse
                </button>
              ) : null}
              <Link className="btn btn-ghost btn-compact" to="/quizzes">
                Timed quiz
              </Link>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="arena-empty">
              <p>Nothing matches those filters.</p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                  setDifficulty("All");
                  setFamily("All");
                  setOnlyBookmarked(false);
                  setHideKnown(false);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <ul className="arena-list" ref={listRef}>
                {filtered.slice(0, limit).map((q, i) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    number={i + 1}
                    open={openId === q.id}
                    onToggle={() => {
                      const next = openId === q.id ? null : q.id;
                      setOpenId(next);
                      // Keep the URL shareable without pushing a history entry
                      // for every open and close.
                      nav(next === null ? "/interview" : `/interview/${next}`, { replace: true });
                    }}
                    bookmarked={progress.bookmarkedQuestions.includes(q.id)}
                    known={progress.masteredQuestions.includes(q.id)}
                    setProgress={setProgress}
                  />
                ))}
              </ul>

              {limit < filtered.length ? (
                <button className="btn btn-secondary arena-more" onClick={() => setLimit((l) => l + PAGE)}>
                  Show {Math.min(PAGE, filtered.length - limit)} more · {filtered.length - limit} left
                </button>
              ) : (
                <p className="muted arena-end">That is every question in this view.</p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function QuestionRow({
  question,
  number,
  open,
  onToggle,
  bookmarked,
  known,
  setProgress,
}: {
  question: InterviewQuestion;
  number: number;
  open: boolean;
  onToggle: () => void;
  bookmarked: boolean;
  known: boolean;
  setProgress: ReturnType<typeof useStore>["setProgress"];
  }) {
  const [picked, setPicked] = useState<number | null>(null);
  const isMcq = Boolean(question.choices?.length);
  const relatedLessons = question.relatedTopics.map((s) => getTopic(s)).filter(Boolean);

  function toggleBookmark() {
    setProgress((p) => ({
      ...p,
      bookmarkedQuestions: bookmarked
        ? p.bookmarkedQuestions.filter((x) => x !== question.id)
        : [...p.bookmarkedQuestions, question.id],
    }));
  }

  // Marking a question known also credits the modules it relates to, which is
  // what the "interview tested" step of module mastery reads.
  function toggleKnown() {
    setProgress((p) => {
      const nowKnown = !known;
      const credited = new Set(p.interviewedTopics);
      if (nowKnown) question.relatedTopics.filter((s) => getTopic(s)).forEach((s) => credited.add(s));
      return {
        ...p,
        masteredQuestions: nowKnown
          ? [...p.masteredQuestions, question.id]
          : p.masteredQuestions.filter((x) => x !== question.id),
        interviewedTopics: [...credited],
        seenQuestions: p.seenQuestions.includes(question.id) ? p.seenQuestions : [...p.seenQuestions, question.id],
      };
    });
  }

  return (
    <li id={`q-${question.id}`} className={`arena-row${open ? " is-open" : ""}${known ? " is-known" : ""}`}>
      <div className="arena-row-head">
        <button type="button" className="arena-row-btn" aria-expanded={open} onClick={onToggle}>
          <span className="arena-row-num">{String(number).padStart(2, "0")}</span>
          <span className={`arena-row-dot d-${question.difficulty.toLowerCase()}`} aria-hidden="true" />
          <span className="arena-row-q">{question.question}</span>
          <span className="arena-row-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 9l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className={`arena-star${bookmarked ? " is-on" : ""}`}
          aria-pressed={bookmarked}
          title={bookmarked ? "Remove bookmark" : "Bookmark"}
          onClick={toggleBookmark}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M6 4h12v16l-6-4-6 4z" strokeLinejoin="round" />
          </svg>
          <span className="visually-hidden">Bookmark</span>
        </button>
      </div>

      {open ? (
        <div className="arena-row-body">
          <p className="arena-row-tags">
            <span className={`badge ${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
            <span className="badge">{question.type}</span>
            {question.tags.slice(0, 5).map((t) => (
              <span key={t} className="badge">
                {t}
              </span>
            ))}
          </p>

          {isMcq ? (
            <ul className="arena-choices" role="radiogroup" aria-label="Answer options">
              {question.choices!.map((c, i) => {
                const correct = i === question.correctIndex;
                const state = picked === null ? "" : correct ? " is-correct" : picked === i ? " is-wrong" : "";
                return (
                  <li key={c}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={picked === i}
                      className={`arena-choice${state}`}
                      disabled={picked !== null}
                      onClick={() => setPicked(i)}
                    >
                      <span className="arena-choice-key">{String.fromCharCode(65 + i)}</span>
                      <span>{c}</span>
                      {picked !== null && correct ? <span className="arena-choice-mark">correct</span> : null}
                      {picked === i && !correct ? <span className="arena-choice-mark">your answer</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!isMcq || picked !== null ? (
            <div className="arena-answer">
              <h3>Answer</h3>
              <p>{question.answer}</p>
              <h3>Explanation</h3>
              <p className="muted">{question.explanation}</p>
              {question.example ? (
                <>
                  <h3>Example</h3>
                  <pre className="codeblock arena-example">{question.example}</pre>
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
          ) : (
            <p className="muted arena-prompt">Pick an option to see the answer.</p>
          )}

          <div className="row arena-row-actions">
            <button className="btn btn-ghost btn-compact" onClick={toggleKnown} aria-pressed={known}>
              {known ? "Known ✓" : "I know this"}
            </button>
            {isMcq && picked !== null ? (
              <button className="btn btn-ghost btn-compact" onClick={() => setPicked(null)}>
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
