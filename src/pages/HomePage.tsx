import { Link } from "react-router-dom";
import { Terminal } from "../components/Terminal";
import { ArchDiagram } from "../components/Diagrams";
import { HeroTerminal } from "../components/HeroTerminal";
import { topics } from "../data/topics";
import { levels } from "../data/roadmap";
import { stats } from "../data/stats.generated";
import { useStore } from "../hooks/useStore";
import { coursePosition, levelCompletion, nextTopic, overallPercent } from "../lib/learning";

export function HomePage() {
  const { progress } = useStore();
  const up = nextTopic(progress);
  const started = progress.completedTopics.length > 0;

  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="kicker">Linux · Unix · Bash</p>
          <h1>
            Linux <em>BashBound</em>
          </h1>
          <p className="tagline">From first command to system mastery.</p>
          <p className="muted hero-copy">
            An interactive Linux and Unix learning environment that takes you from your first terminal command to
            administration, troubleshooting, internals and interview readiness.
          </p>
          <div className="row hero-actions">
            <Link className="btn btn-primary" to={up ? `/learn/${up.slug}` : "/learn"}>
              Start Learning
            </Link>
            <Link className="btn btn-secondary" to="/roadmap">
              Explore Roadmap
            </Link>
            <Link className="btn btn-ghost" to="/interview">
              Practice Interview Questions
            </Link>
          </div>
          <p className="muted hero-hint">
            <kbd>Ctrl</kbd>+<kbd>K</kbd> to jump anywhere · <kbd>Ctrl</kbd>+<kbd>`</kbd> for a simulated shell ·{" "}
            <kbd>?</kbd> for shortcuts
          </p>
        </div>
        <HeroTerminal />
      </section>

      {started && up ? <ContinueStrip slug={up.slug} title={up.title} percent={overallPercent(progress)} /> : null}

      {/* Deliberately not cards: three short claims read better as a list with
          a rule between them than as three boxes competing for attention. */}
      <section className="home-section">
        <p className="kicker">Why BashBound</p>
        <h2>Not another dump of man pages</h2>
        <dl className="claims">
          <div>
            <dt>A path, not a pile</dt>
            <dd>
              Sixteen levels in dependency order. Every module states its prerequisites, its estimated time, and why it
              exists — so you always know what comes next.
            </dd>
          </div>
          <div>
            <dt>Practice in the page</dt>
            <dd>
              A simulated shell with its own filesystem, daily challenges, and incident labs that make you choose the
              next command under pressure. Nothing runs on your machine.
            </dd>
          </div>
          <div>
            <dt>Answers, not trivia</dt>
            <dd>
              {stats.questions.toLocaleString()} interview questions, each with an answer and an explanation, drawn from
              the same lesson and command corpus so the bank stays accurate as the content grows.
            </dd>
          </div>
        </dl>
      </section>

      <section className="home-section">
        <p className="kicker">Learning journey</p>
        <h2>Sixteen levels, one map</h2>
        <p className="muted">
          Fundamentals through production Linux. Your progress fills the path as you go — stored in this browser, no
          account needed.
        </p>

        <ol className="level-rail">
          {levels.map((level) => {
            const { percent, done, total } = levelCompletion(level, progress);
            return (
              <li key={level.id}>
                <Link to={`/roadmap#level-${level.id}`} className="level-chip" title={level.summary}>
                  <span className="level-chip-id">{String(level.id).padStart(2, "0")}</span>
                  <span className="level-chip-title">{level.title}</span>
                  <span className="level-chip-meta">
                    {done}/{total} · ~{level.hours} h
                  </span>
                  <span className="level-chip-bar" aria-hidden="true">
                    <span style={{ width: `${percent}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <Link to="/roadmap" className="btn btn-secondary home-more">
          Open the full roadmap
        </Link>
      </section>

      <section className="home-section home-split">
        <div>
          <p className="kicker">Interactive terminal</p>
          <h2>Simulation Mode</h2>
          <p className="muted">
            A real parser over a virtual filesystem. Type <code>pwd</code>, <code>ls -l</code>, <code>cd</code>,{" "}
            <code>mkdir</code>, pipe things together, redirect output. State persists until you reset it, and nothing
            touches the host OS.
          </p>
          <Terminal compact />
          <Link to="/terminal" className="btn btn-ghost home-more">
            Open the full sandbox
          </Link>
        </div>
        <ArchDiagram />
      </section>

      <section className="home-section">
        <p className="kicker">Start where you are</p>
        <h2>Popular modules</h2>
        <ul className="topic-list">
          {topics.slice(0, 8).map((t) => {
            const { position, total } = coursePosition(t.slug);
            const done = progress.completedTopics.includes(t.slug);
            return (
              <li key={t.slug}>
                <Link to={`/learn/${t.slug}`} className="topic-row">
                  <span className="topic-row-main">
                    <span className="topic-row-title">
                      {done ? <span className="topic-row-check">✓</span> : null}
                      {t.title}
                    </span>
                    <span className="muted topic-row-summary">{t.summary}</span>
                  </span>
                  <span className="topic-row-meta mono-meta">
                    <span className={`badge ${t.difficulty.toLowerCase()}`}>{t.difficulty}</span>
                    <span>{t.minutes} min</span>
                    <span>
                      {position}/{total}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="home-section">
        <p className="kicker">What is in here</p>
        <h2>The corpus</h2>
        <ul className="stat-row">
          <li>
            <strong>{stats.levels}</strong>
            <span>roadmap levels</span>
          </li>
          <li>
            <strong>{stats.topics}</strong>
            <span>modules</span>
          </li>
          <li>
            <strong>{stats.concepts}</strong>
            <span>concepts</span>
          </li>
          <li>
            <strong>{stats.commands}</strong>
            <span>commands</span>
          </li>
          <li>
            <strong>{stats.questions.toLocaleString()}</strong>
            <span>interview questions</span>
          </li>
          <li>
            <strong>{stats.challenges}</strong>
            <span>challenges</span>
          </li>
          <li>
            <strong>{stats.labs}</strong>
            <span>incident labs</span>
          </li>
          <li>
            <strong>{stats.cheatSheets}</strong>
            <span>cheat sheets</span>
          </li>
        </ul>
        <p className="muted corpus-note">
          Counted from the content itself at build time — not a marketing figure.
        </p>
      </section>

      <section className="home-section home-final">
        <h2>Completely new to Linux?</h2>
        <p className="muted">
          Take the beginner path from “what is an operating system”. Already live in a terminal? Skip ahead and test
          yourself instead.
        </p>
        <div className="row">
          <Link className="btn btn-primary" to="/learn?path=beginner">
            I am completely new
          </Link>
          <Link className="btn btn-secondary" to="/interview">
            Test my knowledge
          </Link>
        </div>
      </section>
    </div>
  );
}

function ContinueStrip({ slug, title, percent }: { slug: string; title: string; percent: number }) {
  const { position, total } = coursePosition(slug);
  return (
    <section className="continue" aria-label="Continue learning">
      <div className="continue-main">
        <p className="kicker">Welcome back</p>
        <p className="continue-title">{title}</p>
        <p className="muted mono-meta">
          <span>
            module {position} of {total}
          </span>
          <span>{percent}% of the roadmap</span>
        </p>
      </div>
      <div className="continue-side">
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <Link className="btn btn-primary" to={`/learn/${slug}`}>
          Continue learning →
        </Link>
      </div>
    </section>
  );
}
