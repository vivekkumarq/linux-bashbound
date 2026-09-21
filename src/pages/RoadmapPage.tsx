import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { levels } from "../data/roadmap";
import { topicMap } from "../data/topics";
import { useStore } from "../hooks/useStore";
import { levelCompletion, levelStatus, nextTopic, type LevelStatus } from "../lib/learning";

const STATUS_HINT: Record<LevelStatus, string> = {
  Locked: "Prerequisite levels are unfinished. Nothing stops you opening it anyway if you already know the material.",
  Available: "Unlocked — nothing here depends on work you have not done.",
  "In Progress": "Started. Pick up where you left off.",
  Completed: "Every module read. Practise and test to reach mastery.",
  Mastered: "Read, practised, quizzed and interviewed across every module.",
};

export function RoadmapPage() {
  const { progress } = useStore();
  const [open, setOpen] = useState<number | null>(null);

  const up = useMemo(() => nextTopic(progress), [progress]);
  const currentLevel = up ? topicMap.get(up.slug)?.level : undefined;

  const totalDone = progress.completedTopics.length;
  const totalTopics = levels.reduce((n, l) => n + l.topics.length, 0);
  const overall = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

  return (
    <div className="roadmap-page">
      <header className="roadmap-head">
        <p className="kicker">Curriculum map</p>
        <h1>The sixteen levels</h1>
        <p className="muted">
          Each level builds on the one before it. Nodes unlock as prerequisites are met — but nothing is locked away, so
          if you already know a level, skip it and the map catches up.
        </p>

        <div className="roadmap-overall">
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${overall}%` }} />
          </div>
          <p className="muted mono-meta">
            <span>
              {totalDone} of {totalTopics} modules
            </span>
            <span>{overall}% of the roadmap</span>
          </p>
        </div>
      </header>

      <ol className="roadmap-track">
        {levels.map((level) => {
          const { done, total, percent } = levelCompletion(level, progress);
          const status = levelStatus(level, progress);
          const statusClass = status.toLowerCase().replace(" ", "-");
          const isCurrent = level.id === currentLevel;
          const expanded = open === level.id;

          return (
            <li
              key={level.id}
              id={`level-${level.id}`}
              className={`rm-node status-${statusClass}${isCurrent ? " is-current" : ""}`}
            >
              {/* The rail is the spine of the map. Its inner fill is this
                  level's completion, so the path draws itself as you progress. */}
              <div className="rm-rail" aria-hidden="true">
                <span className="rm-dot">{String(level.id).padStart(2, "0")}</span>
                <span className="rm-line">
                  <span className="rm-line-fill" style={{ height: `${percent}%` }} />
                </span>
              </div>

              <div className="rm-body">
                <div className="rm-title-row">
                  <h2 className="rm-title">
                    <button
                      type="button"
                      className="rm-title-btn"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : level.id)}
                    >
                      {level.title}
                    </button>
                  </h2>
                  <span className={`rm-status rm-status-${statusClass}`}>{status}</span>
                  {isCurrent ? <span className="rm-here">you are here</span> : null}
                </div>

                <p className="rm-subtitle">{level.subtitle}</p>

                <p className="mono-meta muted">
                  <span className={`badge ${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
                  <span>~{level.hours} h</span>
                  <span>
                    {done}/{total} modules
                  </span>
                  <span>{level.prerequisites.length ? `needs level ${level.prerequisites.join(", ")}` : "no prerequisites"}</span>
                </p>

                <div className="progress-bar rm-progress">
                  <span style={{ width: `${percent}%` }} />
                </div>

                {expanded ? (
                  <div className="rm-detail">
                    <p>{level.summary}</p>
                    <p className="muted rm-hint">{STATUS_HINT[status]}</p>
                  </div>
                ) : null}

                <ul className="rm-topics">
                  {level.topics.map((slug) => {
                    const topic = topicMap.get(slug);
                    const isDone = progress.completedTopics.includes(slug);
                    return (
                      <li key={slug}>
                        <Link to={`/learn/${slug}`} className={`rm-topic${isDone ? " is-done" : ""}`}>
                          <span className="rm-check" aria-hidden="true">
                            {isDone ? "✓" : "○"}
                          </span>
                          {topic?.title ?? slug}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="roadmap-cta">
        {up ? (
          <>
            <p className="muted">Next unfinished module</p>
            <Link className="btn btn-primary" to={`/learn/${up.slug}`}>
              Continue with {up.title}
            </Link>
          </>
        ) : (
          <>
            <p className="muted">Every module is marked complete. Now test it.</p>
            <Link className="btn btn-primary" to="/interview">
              Open the Interview Arena
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
