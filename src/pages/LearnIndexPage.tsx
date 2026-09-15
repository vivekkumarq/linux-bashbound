import { Link, useSearchParams } from "react-router-dom";
import { beginnerPath, topics } from "../data/topics";
import { levels } from "../data/roadmap";
import { useStore } from "../hooks/useStore";

export function LearnIndexPage() {
  const [params] = useSearchParams();
  const path = params.get("path");
  const { progress } = useStore();
  const next = beginnerPath.find((s) => !progress.completedTopics.includes(s)) ?? beginnerPath[0];

  return (
    <div>
      <p className="kicker">Learn</p>
      <h1>{path === "advanced" ? "Skip ahead with intent" : "Start here"}</h1>
      {path === "beginner" || !path ? (
        <p className="muted">
          Completely new: follow the beginner path. Current next module: <Link to={`/learn/${next}`}>{next}</Link>
        </p>
      ) : (
        <p className="muted">
          Test yourself in the <Link to="/quizzes">quiz room</Link> or jump to advanced modules below.
        </p>
      )}

      {path !== "advanced" && (
        <ol className="path-list">
          {beginnerPath.map((slug, i) => {
            const t = topics.find((x) => x.slug === slug)!;
            return (
              <li key={slug} className="path-item">
                <span className="path-num">
                  {String(i + 1).padStart(2, "0")} / {beginnerPath.length}
                </span>
                <div>
                  <h3>
                    <Link to={`/learn/${slug}`}>{t.title}</Link>
                  </h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {t.summary} · {t.concepts.length} concepts
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <h2>All modules by level</h2>
      {levels.map((lv) => (
        <section key={lv.id} style={{ marginTop: 18 }}>
          <h3>
            Level {lv.id}: {lv.title}
          </h3>
          <div className="row">
            {topics
              .filter((t) => t.level === lv.id)
              .map((t) => (
                <Link key={t.slug} className="badge" to={`/learn/${t.slug}`}>
                  {progress.completedTopics.includes(t.slug) ? "✓ " : ""}
                  {t.title}
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
