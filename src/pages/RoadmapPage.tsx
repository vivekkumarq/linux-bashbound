import { Link } from "react-router-dom";
import { levels } from "../data/roadmap";
import { topicMap } from "../data/topics";
import { useStore } from "../hooks/useStore";

export function RoadmapPage() {
  const { progress } = useStore();
  return (
    <div>
      <p className="kicker">Curriculum map</p>
      <h1>Learning roadmap</h1>
      <p className="muted">
        Follow the levels in order if you are new. Each node opens a module. Completion is stored in this browser.
      </p>
      <div className="roadmap" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        {levels.map((lv) => {
          const done = lv.topics.filter((s) => progress.completedTopics.includes(s)).length;
          return (
            <article key={lv.id} id={`level-${lv.id}`} className="level-card">
              <div>
                <div className="kicker">LEVEL {lv.id}</div>
                <div className={`badge ${lv.difficulty.toLowerCase()}`}>{lv.difficulty}</div>
              </div>
              <div>
                <h2>{lv.title}</h2>
                <p className="muted">{lv.summary}</p>
                <p className="muted" style={{ fontFamily: "var(--font-meta)", fontSize: 13 }}>
                  ~{lv.hours} h · {done}/{lv.topics.length} modules complete
                  {lv.prerequisites.length ? ` · Needs levels ${lv.prerequisites.join(", ")}` : ""}
                </p>
                <div className="progress-bar" style={{ margin: "10px 0 14px" }}>
                  <span style={{ width: `${(done / lv.topics.length) * 100}%` }} />
                </div>
                <div className="row">
                  {lv.topics.map((slug) => {
                    const t = topicMap.get(slug);
                    const ok = progress.completedTopics.includes(slug);
                    return (
                      <Link key={slug} className="badge" to={`/learn/${slug}`}>
                        {ok ? "✓ " : ""}
                        {t?.title ?? slug}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
