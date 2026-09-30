import { Link } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { courseTopics, levels, topicBySlug } from "../lib/learning";

/**
 * The guided route in.
 *
 * This page used to end with every module in the course printed as a wall of
 * pill chips grouped by level — which is what the rail and the roadmap
 * already do, better. It now does the one thing neither of those does: put
 * fourteen modules in a deliberate order for someone who has never opened a
 * terminal.
 *
 * Reads the generated catalog rather than the corpus, so browsing the index
 * never downloads the lesson bodies.
 */

const BEGINNER_PATH = [
  "what-is-linux",
  "linux-vs-unix",
  "distributions",
  "directory-map",
  "help-systems",
  "terminal-shell",
  "bash-basics",
  "env-and-path",
  "quoting-expansion",
  "inodes-and-links",
  "mode-bits",
  "process-model",
  "net-fundamentals",
  "bash-scripting",
];

export function LearnIndexPage() {
  const { progress } = useStore();

  const steps = BEGINNER_PATH.map((slug) => topicBySlug.get(slug)).filter((t) => t !== undefined);
  const doneCount = steps.filter((t) => progress.completedTopics.includes(t.slug)).length;
  const next = steps.find((t) => !progress.completedTopics.includes(t.slug)) ?? steps[0];

  return (
    <div className="learn-index">
      <p className="kicker">Learn</p>
      <h1>Start here</h1>
      <p className="muted learn-lede">
        Fourteen modules in a deliberate order, from what Linux actually is to writing your first script. Every other
        module is one click away in the rail, or on the <Link to="/roadmap">roadmap</Link>.
      </p>

      <div className="learn-status">
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%` }} />
        </div>
        <p className="mono-meta muted">
          <span>
            {doneCount} of {steps.length} on this path
          </span>
          <span>{courseTopics.length} modules in total</span>
        </p>
      </div>

      {next ? (
        <Link className="btn btn-primary learn-cta" to={`/learn/${next.slug}`}>
          {doneCount === 0 ? "Begin with" : "Continue with"} {next.title}
        </Link>
      ) : null}

      <ol className="path-list">
        {steps.map((topic, i) => {
          const done = progress.completedTopics.includes(topic.slug);
          return (
            <li key={topic.slug} className={`path-item${done ? " is-done" : ""}`}>
              <span className="path-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="path-body">
                <h3>
                  <Link to={`/learn/${topic.slug}`}>{topic.title}</Link>
                </h3>
                <p className="muted path-summary">{topic.summary}</p>
                <p className="mono-meta muted">
                  <span className={`badge ${topic.difficulty.toLowerCase()}`}>{topic.difficulty}</span>
                  <span>{topic.minutes} min</span>
                  <span>
                    {topic.concepts} concept{topic.concepts === 1 ? "" : "s"}
                  </span>
                  <span>level {String(topic.level).padStart(2, "0")}</span>
                </p>
              </div>
              {done ? (
                <span className="path-done" title="Marked read">
                  ✓
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <section className="learn-after">
        <h2>Already comfortable in a terminal?</h2>
        <p className="muted">
          Skip the path. The roadmap shows all {levels.length} levels with their prerequisites, and the arena will find
          the gaps faster than reading will.
        </p>
        <div className="row">
          <Link className="btn btn-secondary" to="/roadmap">
            Open the roadmap
          </Link>
          <Link className="btn btn-ghost" to="/interview">
            Test yourself
          </Link>
        </div>
      </section>
    </div>
  );
}
