import { Link, useNavigate, useParams } from "react-router-dom";
import { getTopic, topics } from "../data/topics";
import { levels } from "../data/roadmap";
import { CodeBlock } from "../components/CodeBlock";
import { visualsForTopic } from "../components/interactive/forTopic";
import { MasteryBar } from "../components/MasteryBar";
import { useStore } from "../hooks/useStore";
import { extractRunnable, usePalette } from "../lib/paletteContext";
import { coursePosition, lessonNeighbours } from "../lib/learning";

export function TopicPage() {
  const { slug = "" } = useParams();
  const topic = getTopic(slug);
  const nav = useNavigate();
  const { progress, setProgress } = useStore();
  const pal = usePalette();

  if (!topic) {
    return (
      <div className="notfound">
        <h1>No such module</h1>
        <p className="muted">
          There is no lesson at <code>/learn/{slug}</code>.
        </p>
        <Link className="btn btn-primary" to="/learn">
          Browse all modules
        </Link>
      </div>
    );
  }

  // Roadmap order, not array order — the roadmap is the course.
  const { position, total } = coursePosition(slug);
  const { previous: prev, next } = lessonNeighbours(slug);
  const level = levels.find((l) => l.id === topic.level);
  const complete = progress.completedTopics.includes(slug);
  const practised = progress.practicedTopics.includes(slug);

  function toggleComplete() {
    setProgress((p) => ({
      ...p,
      completedTopics: complete ? p.completedTopics.filter((s) => s !== slug) : [...p.completedTopics, slug],
    }));
  }

  function togglePractised() {
    setProgress((p) => ({
      ...p,
      practicedTopics: practised ? p.practicedTopics.filter((s) => s !== slug) : [...p.practicedTopics, slug],
    }));
  }

  return (
    <div className="learn-layout">
      <aside className="sidebar-nav" aria-label="Modules in this level">
        <p className="kicker">Level {topic.level}</p>
        {topics
          .filter((t) => t.level === topic.level)
          .map((t) => (
            <Link key={t.slug} to={`/learn/${t.slug}`} className={t.slug === slug ? "active" : ""}>
              {progress.completedTopics.includes(t.slug) ? "✓ " : ""}
              {t.title}
            </Link>
          ))}
      </aside>

      <article>
        <p className="kicker">
          Module {position} of {total} · {level?.title ?? `Level ${topic.level}`}
        </p>
        <h1>{topic.title}</h1>

        <p className="mono-meta muted lesson-meta">
          <span className={`badge ${topic.difficulty.toLowerCase()}`}>{topic.difficulty}</span>
          <span>{topic.minutes} min</span>
          <span>
            {topic.concepts.length} concept{topic.concepts.length === 1 ? "" : "s"}
          </span>
        </p>

        {topic.prerequisites.length ? (
          <p className="lesson-prereq">
            <span className="muted">Assumes: </span>
            {topic.prerequisites.map((p) => {
              const pre = getTopic(p);
              return (
                <Link key={p} className="badge" to={`/learn/${p}`}>
                  {pre?.title ?? p}
                </Link>
              );
            })}
          </p>
        ) : null}

        <p>{topic.summary}</p>

        <div className="callout">
          <strong>Why this matters. </strong>
          {topic.why}
        </div>

        <MasteryBar slug={slug} />

        {visualsForTopic(slug)}

        {topic.concepts.map((c) => (
          <section key={c.id} id={c.id} className="concept-block">
            <h2>{c.title}</h2>
            {c.takeaway ? (
              <p className="takeaway">
                <strong>In one line. </strong>
                {c.takeaway}
              </p>
            ) : null}
            <h3>Simple explanation</h3>
            <p>{c.simple}</p>
            <h3>Technical explanation</h3>
            <p>{c.technical}</p>
            <h3>Real-world analogy</h3>
            <p>{c.analogy}</p>
            <h3>Example</h3>
            <CodeBlock
              code={`$ ${c.example.command}\n${c.example.output}`}
              onTry={(code) => pal.openBash(extractRunnable(code))}
            />
            <p className="muted">{c.example.explanation}</p>
            {c.whereUsed?.length ? (
              <>
                <h3>Where you see this</h3>
                <ul>
                  {c.whereUsed.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <h3>Common mistakes</h3>
            <ul>
              {c.mistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <h3>Best practices</h3>
            <ul>
              {c.practices.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>

            <div className="lesson-box">
              <h3>Practical exercise</h3>
              <p>{c.exercise.prompt}</p>
              <details>
                <summary>Show approach</summary>
                <p>{c.exercise.solution}</p>
              </details>
            </div>

            <div className="lesson-box lesson-box-interview">
              <h3>Interview relevance</h3>
              <p className="lesson-question">{c.interview.question}</p>
              <details>
                <summary>Reveal answer</summary>
                <p>{c.interview.answer}</p>
              </details>
            </div>

            {c.related.length ? (
              <p className="related-row">
                <span className="muted">Related: </span>
                {c.related.map((r) =>
                  getTopic(r) ? (
                    <Link key={r} className="badge related-link" to={`/learn/${r}`}>
                      {getTopic(r)?.title ?? r}
                    </Link>
                  ) : (
                    <span key={r} className="badge related-plain">
                      {r}
                    </span>
                  ),
                )}
              </p>
            ) : null}
          </section>
        ))}

        <h2>References</h2>
        <ul>
          {topic.references.map((r) => (
            <li key={r.href}>
              <a href={r.href} rel="noreferrer" target="_blank">
                {r.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="lesson-actions">
          <button className="btn btn-primary" onClick={toggleComplete}>
            {complete ? "Mark unread" : "Mark this module read"}
          </button>
          <button className="btn btn-secondary" onClick={togglePractised}>
            {practised ? "Practised ✓" : "I ran the exercises"}
          </button>
          <button className="btn btn-ghost" onClick={() => pal.openBash()}>
            Open the sandbox
          </button>
        </div>

        <nav className="lesson-nav" aria-label="Module navigation">
          {prev ? (
            <button className="lesson-nav-btn" onClick={() => nav(`/learn/${prev.slug}`)}>
              <span className="muted">← Previous</span>
              <span>{prev.title}</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button className="lesson-nav-btn is-next" onClick={() => nav(`/learn/${next.slug}`)}>
              <span className="muted">Next →</span>
              <span>{next.title}</span>
            </button>
          ) : (
            <Link className="lesson-nav-btn is-next" to="/interview">
              <span className="muted">Course complete →</span>
              <span>Test yourself in the Arena</span>
            </Link>
          )}
        </nav>
      </article>

      <aside className="on-page toc" aria-label="On this page">
        <p className="kicker">On this page</p>
        {topic.concepts.map((c) => (
          <a key={c.id} href={`#${c.id}`}>
            {c.title}
          </a>
        ))}
      </aside>
    </div>
  );
}
