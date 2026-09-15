import { Link, useNavigate, useParams } from "react-router-dom";
import { getTopic, topics } from "../data/topics";
import { levels } from "../data/roadmap";
import { CodeBlock } from "../components/CodeBlock";
import { FdDiagram, PermDiagram, ProcessDiagram, UnixCompare } from "../components/Diagrams";
import { useStore } from "../hooks/useStore";

export function TopicPage() {
  const { slug = "" } = useParams();
  const topic = getTopic(slug);
  const nav = useNavigate();
  const { progress, setProgress } = useStore();
  if (!topic) {
    return (
      <p>
        Unknown topic. <Link to="/learn">Back to learn</Link>
      </p>
    );
  }
  const idx = topics.findIndex((t) => t.slug === slug);
  const prev = topics[idx - 1];
  const next = topics[idx + 1];
  const level = levels.find((l) => l.id === topic.level)!;
  const complete = progress.completedTopics.includes(topic.slug);

  return (
    <div className="learn-layout">
      <aside className="sidebar-nav" aria-label="Course">
        <p className="kicker">Level {topic.level}</p>
        {topics
          .filter((t) => t.level === topic.level)
          .map((t) => (
            <Link key={t.slug} to={`/learn/${t.slug}`} className={t.slug === slug ? "active" : ""}>
              {t.title}
            </Link>
          ))}
      </aside>
      <article>
        <p className="kicker">
          Lesson {idx + 1} of {topics.length} · {level.title}
        </p>
        <h1>{topic.title}</h1>
        <div className="row">
          <span className={`badge ${topic.difficulty.toLowerCase()}`}>{topic.difficulty}</span>
          <span className="badge">{topic.minutes} min</span>
          {topic.prerequisites.map((p) => (
            <Link key={p} className="badge" to={`/learn/${p}`}>
              prereq: {p}
            </Link>
          ))}
        </div>
        <p>{topic.summary}</p>
        <div className="callout">
          <strong>Why this matters. </strong>
          {topic.why}
        </div>

        {slug === "mode-bits" ? <PermDiagram /> : null}
        {slug === "pipes-redirection" ? <FdDiagram /> : null}
        {slug === "process-model" || slug === "jobs-signals" ? <ProcessDiagram /> : null}
        {slug === "linux-vs-unix" || slug === "unix-posix" ? <UnixCompare /> : null}

        {topic.concepts.map((c) => (
          <section key={c.id} id={c.id} style={{ marginTop: 28 }}>
            <h2>{c.title}</h2>
            <h3>Simple explanation</h3>
            <p>{c.simple}</p>
            <h3>Technical explanation</h3>
            <p>{c.technical}</p>
            <h3>Real-world analogy</h3>
            <p>{c.analogy}</p>
            <h3>Example</h3>
            <CodeBlock code={`$ ${c.example.command}\n${c.example.output}`} />
            <p className="muted">{c.example.explanation}</p>
            {c.whereUsed?.length ? (
              <>
                <h3>Where is this used?</h3>
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
            <div className="card">
              <h3>Practical exercise</h3>
              <p>{c.exercise.prompt}</p>
              <details>
                <summary>Show approach</summary>
                <p>{c.exercise.solution}</p>
              </details>
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <h3>Interview relevance</h3>
              <p style={{ fontFamily: "var(--font-interview)" }}>{c.interview.question}</p>
              <details>
                <summary>Reveal answer</summary>
                <p>{c.interview.answer}</p>
              </details>
            </div>
            {c.related.length ? (
              <p>
                Related:{" "}
                {c.related.map((r) => (
                  <Link key={r} className="badge" to={`/learn/${r}`}>
                    {r}
                  </Link>
                ))}
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

        <div className="row" style={{ marginTop: 24 }}>
          <button
            className="btn btn-primary"
            onClick={() =>
              setProgress((p) => ({
                ...p,
                completedTopics: complete ? p.completedTopics.filter((s) => s !== slug) : [...p.completedTopics, slug],
              }))
            }
          >
            {complete ? "Mark unread" : "Mark complete"}
          </button>
        </div>
        <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          {prev ? (
            <button className="btn btn-secondary" onClick={() => nav(`/learn/${prev.slug}`)}>
              Previous: {prev.title}
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button className="btn btn-secondary" onClick={() => nav(`/learn/${next.slug}`)}>
              Next: {next.title}
            </button>
          ) : null}
        </div>
      </article>
      <aside className="on-page toc">
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
