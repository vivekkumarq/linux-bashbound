import { Link } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { topics, beginnerPath } from "../data/topics";
import { questions } from "../data/questions";
import { challengeForDate } from "../data/challenges";

export function ProgressPage() {
  const { progress } = useStore();
  const next = beginnerPath.find((s) => !progress.completedTopics.includes(s));
  const rec = topics.find((t) => t.slug === next);
  const ch = challengeForDate();

  return (
    <div>
      <p className="kicker">My Learning</p>
      <h1>Progress in this browser</h1>
      <p className="muted">No account. Data stays in localStorage on this device.</p>
      <div className="grid-3">
        <div className="card">
          <h3>Modules</h3>
          <p>
            {progress.completedTopics.length} / {topics.length}
          </p>
        </div>
        <div className="card">
          <h3>Streak</h3>
          <p>{progress.streak} day{progress.streak === 1 ? "" : "s"}</p>
        </div>
        <div className="card">
          <h3>Interview mastered</h3>
          <p>
            {progress.masteredQuestions.length} / {questions.length}
          </p>
        </div>
      </div>
      <h2>Recommended next</h2>
      {rec ? (
        <Link className="card" to={`/learn/${rec.slug}`} style={{ display: "block" }}>
          {rec.title} — {rec.summary}
        </Link>
      ) : (
        <p>Beginner path complete. Open the roadmap for production topics.</p>
      )}
      <h2>Completed topics</h2>
      <div className="row">
        {progress.completedTopics.length
          ? progress.completedTopics.map((s) => (
              <Link key={s} className="badge" to={`/learn/${s}`}>
                {s}
              </Link>
            ))
          : <p className="muted">None yet.</p>}
      </div>
      <h2>Bookmarked questions</h2>
      <ul>
        {progress.bookmarkedQuestions.length ? (
          progress.bookmarkedQuestions.map((id) => (
            <li key={id}>
              <Link to={`/interview/${id}`}>Question #{id}</Link>
            </li>
          ))
        ) : (
          <p className="muted">Bookmark from the Interview Arena.</p>
        )}
      </ul>
      <h2>Quiz history</h2>
      {progress.quizHistory.length ? (
        <ul>
          {progress.quizHistory
            .slice(-8)
            .reverse()
            .map((h) => (
              <li key={h.at}>
                {new Date(h.at).toLocaleString()} — {h.category} {h.score}/{h.total}
              </li>
            ))}
        </ul>
      ) : (
        <p className="muted">No quizzes yet.</p>
      )}
      <p>
        Today’s challenge: <Link to="/challenges">{ch.title}</Link>
      </p>
    </div>
  );
}
