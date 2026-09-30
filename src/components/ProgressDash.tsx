import { useMemo } from "react";
import { Link } from "react-router-dom";
import { stats } from "../data/stats.generated";
import { useStore } from "../hooks/useStore";
import { coursePosition, nextTopic, overallPercent } from "../lib/learning";

/**
 * The "where you are" panel on the home page.
 *
 * Every figure here is read from stored progress — there is no seeded or
 * sample data, so a first visit honestly shows zeroes and an empty heatmap.
 */

const WEEKS = 12;
const DAY_MS = 86_400_000;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Activity per day, counted from the things that carry a date already:
 * days the app was opened, challenges solved, and quizzes taken.
 */
function useActivity() {
  const { progress } = useStore();

  return useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (key: string, by: number) => counts.set(key, (counts.get(key) ?? 0) + by);

    (progress.activeDays ?? []).forEach((d) => bump(d, 1));
    (progress.challengeDays ?? []).forEach((d) => bump(d, 2));
    (progress.quizHistory ?? []).forEach((q) => bump(dayKey(new Date(q.at)), 2));

    // Build the grid back from today, aligned so each column is a week.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (WEEKS * 7 - 1) * DAY_MS);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday

    const cells: { key: string; count: number; isToday: boolean; future: boolean }[] = [];
    for (let i = 0; i < WEEKS * 7; i += 1) {
      const d = new Date(start.getTime() + i * DAY_MS);
      const key = dayKey(d);
      cells.push({
        key,
        count: counts.get(key) ?? 0,
        isToday: key === dayKey(today),
        future: d > today,
      });
    }

    return { cells, activeCount: counts.size };
  }, [progress.activeDays, progress.challengeDays, progress.quizHistory]);
}

function level(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export function ProgressDash() {
  const { progress } = useStore();
  const { cells, activeCount } = useActivity();

  const percent = overallPercent(progress);
  const up = nextTopic(progress);
  const position = up ? coursePosition(up.slug) : null;

  const r = 28;
  const circumference = 2 * Math.PI * r;

  return (
    <section className="dash" aria-label="Your progress">
      <div className="dash-head">
        <div className="dash-ring" role="img" aria-label={`${percent} per cent of the course complete`}>
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle className="dr-bg" cx="32" cy="32" r={r} />
            <circle
              className="dr-fg"
              cx="32"
              cy="32"
              r={r}
              strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
            />
          </svg>
          <b>{percent}%</b>
        </div>

        <div className="dash-sum">
          <b>{progress.completedTopics.length > 0 ? "Welcome back" : "Your progress"}</b>
          <span>
            {progress.completedTopics.length} of {stats.topics} modules read
          </span>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dstat">
          <strong>{progress.streak}</strong>
          <span>day streak</span>
        </div>
        <Link className="dstat" to="/interview">
          <strong>{progress.masteredQuestions.length}</strong>
          <span>questions known</span>
        </Link>
        <Link className="dstat" to="/challenges">
          <strong>{progress.challengeDays.length}</strong>
          <span>challenges done</span>
        </Link>
      </div>

      <div className="dash-heat">
        <div className="heat" role="img" aria-label={`Active on ${activeCount} days in the last twelve weeks`}>
          {cells.map((cell) => (
            <span
              key={cell.key}
              className={`hm l${level(cell.count)}${cell.isToday ? " is-today" : ""}${cell.future ? " is-future" : ""}`}
              title={`${cell.key}: ${cell.count === 0 ? "nothing yet" : `${cell.count} action${cell.count === 1 ? "" : "s"}`}`}
            />
          ))}
        </div>
        <p className="heat-legend">
          <span>12 weeks</span>
          <span className="heat-scale">
            less
            <i className="hm l0" />
            <i className="hm l1" />
            <i className="hm l2" />
            <i className="hm l3" />
            <i className="hm l4" />
            more
          </span>
        </p>
      </div>

      {up ? (
        <div className="dash-next">
          <p className="dash-next-label">Next up</p>
          <Link className="dash-next-link" to={`/learn/${up.slug}`}>
            {up.title}
          </Link>
          {position ? (
            <p className="muted dash-next-meta">
              module {position.position} of {position.total}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="dash-next">
          <p className="dash-next-label">Course complete</p>
          <Link className="dash-next-link" to="/interview">
            Test yourself in the Arena
          </Link>
        </div>
      )}
    </section>
  );
}
