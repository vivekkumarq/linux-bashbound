import { Link } from "react-router-dom";
import { Terminal } from "../components/Terminal";
import { ArchDiagram } from "../components/Diagrams";
import { topics } from "../data/topics";
import { questions } from "../data/questions";
import { commands } from "../data/commands";
import { levels } from "../data/roadmap";

export function HomePage() {
  return (
    <div>
      <section className="hero">
        <div>
          <p className="kicker">Linux · Unix · Bash</p>
          <h1>
            Linux <em>BashBound</em>
          </h1>
          <p className="tagline">From first command to system mastery.</p>
          <p className="muted">
            A structured journey from “What is Linux?” to administration, internals, troubleshooting, and interviews.
            Always know where you are, what to learn next, and what to practice.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" to="/learn">
              Start Learning
            </Link>
            <Link className="btn btn-secondary" to="/roadmap">
              Explore Roadmap
            </Link>
            <Link className="btn btn-ghost" to="/interview">
              Practice Interview Questions
            </Link>
          </div>
        </div>
        <HeroTerminal />
      </section>

      <section style={{ marginTop: 56 }}>
        <p className="kicker">Why BashBound</p>
        <h2>Not another dump of man pages</h2>
        <div className="grid-3">
          <article className="card">
            <h3>Step-by-step path</h3>
            <p className="muted">Beginners never land on a wall of jargon. Each module has a next step, prerequisites, and a why.</p>
          </article>
          <article className="card">
            <h3>Practice that sticks</h3>
            <p className="muted">Simulated terminal, command explorer, daily challenges, and incident-style labs.</p>
          </article>
          <article className="card">
            <h3>Interview-ready</h3>
            <p className="muted">{questions.length}+ curated questions with answers, explanations, and filters — not a hollow counter.</p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 56 }}>
        <p className="kicker">Learning journey</p>
        <h2>Sixteen levels, one map</h2>
        <p className="muted">Inspired by progressive roadmaps, designed as an original BashBound path.</p>
        <div className="grid-2" style={{ marginTop: 16 }}>
          {levels.slice(0, 6).map((l) => (
            <Link key={l.id} className="card" to={`/roadmap#level-${l.id}`}>
              <span className={`badge ${l.difficulty.toLowerCase()}`}>
                LEVEL {l.id} · {l.difficulty}
              </span>
              <h3 style={{ marginTop: 8 }}>{l.title}</h3>
              <p className="muted">{l.subtitle}</p>
            </Link>
          ))}
        </div>
        <Link to="/roadmap" className="btn btn-secondary" style={{ marginTop: 16 }}>
          Open full roadmap
        </Link>
      </section>

      <section style={{ marginTop: 56 }} className="grid-2">
        <div>
          <p className="kicker">Interactive terminal</p>
          <h2>Simulation Mode</h2>
          <p className="muted">
            Type pwd, ls, cd, mkdir, and friends. State persists until you reset. Nothing runs on the host OS.
          </p>
          <Terminal compact />
        </div>
        <ArchDiagram />
      </section>

      <section style={{ marginTop: 56 }}>
        <p className="kicker">Popular topics</p>
        <h2>Start where you are</h2>
        <div className="grid-3">
          {topics.slice(0, 6).map((t) => (
            <Link key={t.slug} to={`/learn/${t.slug}`} className="card">
              <span className={`badge ${t.difficulty.toLowerCase()}`}>{t.difficulty}</span>
              <h3>{t.title}</h3>
              <p className="muted">{t.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 56 }} className="card">
        <p className="kicker">Interview Arena</p>
        <h2>Questions operators actually get asked</h2>
        <p className="muted">
          {questions.length} items across fundamentals, Bash, networking, incidents, and kernel — generated from the
          same command and lesson corpus so the bank stays accurate as content grows.
        </p>
        <Link className="btn btn-primary" to="/interview">
          Enter the Arena
        </Link>
      </section>

      <section style={{ marginTop: 28 }} className="grid-2">
        <div className="card">
          <h3>Daily Linux Challenge</h3>
          <p className="muted">One practical task. Hints first. Solution when you are ready.</p>
          <Link to="/challenges">Today’s challenge</Link>
        </div>
        <div className="card">
          <h3>Learning statistics</h3>
          <p className="muted">
            {topics.length} modules · {commands.length} commands · {questions.length} interview items · {levels.length}{" "}
            roadmap levels
          </p>
          <Link to="/progress">Open My Learning</Link>
        </div>
      </section>

      <section style={{ marginTop: 48, textAlign: "center" }}>
        <h2>Completely new to Linux?</h2>
        <p className="muted">Take the beginner path. Skip ahead if you already live in a terminal.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" to="/learn?path=beginner">
            I’m completely new
          </Link>
          <Link className="btn btn-secondary" to="/learn?path=advanced">
            Test your knowledge
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroTerminal() {
  return (
    <div className="terminal" aria-hidden="true">
      <div className="terminal-bar">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span>guest@bashbound:~</span>
      </div>
      <div className="terminal-body">
        <div>
          <span className="prompt">$</span> whoami
        </div>
        <div>learner</div>
        <div style={{ marginTop: 10 }}>
          <span className="prompt">$</span> uname -a
        </div>
        <div>Linux BashBound</div>
        <div style={{ marginTop: 10 }}>
          <span className="prompt">$</span> ./start-learning.sh
        </div>
        <div className="muted">opening roadmap · loading first lesson · ready</div>
      </div>
    </div>
  );
}
