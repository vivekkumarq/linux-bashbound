import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="brand">
            <Logo />
            <span className="brand-text">
              <strong>
                Linux <em>BashBound</em>
              </strong>
              <small>From first command to mastery</small>
            </span>
          </div>
          <p className="muted">From First Command to System Mastery.</p>
          <p className="muted" style={{ fontSize: 13 }}>
            An educational project for learning Linux and Unix. Commands in the on-site terminal are simulated and do
            not run on your machine. Prefer man pages, POSIX, GNU, kernel, and distribution documentation as
            authoritative references.
          </p>
        </div>
        <div>
          <strong>Learning</strong>
          <div className="stack" style={{ marginTop: 8 }}>
            <Link to="/roadmap">Roadmap</Link>
            <Link to="/learn">Beginner path</Link>
            <Link to="/commands">Command explorer</Link>
            <Link to="/cheatsheets">Cheat sheets</Link>
          </div>
        </div>
        <div>
          <strong>Practice</strong>
          <div className="stack" style={{ marginTop: 8 }}>
            <Link to="/interview">Interview Arena</Link>
            <Link to="/quizzes">Quizzes</Link>
            <Link to="/challenges">Daily challenge</Link>
            <Link to="/troubleshooting">Troubleshooting lab</Link>
          </div>
        </div>
        <div>
          <strong>Resources</strong>
          <div className="stack" style={{ marginTop: 8 }}>
            <a href="https://man7.org/linux/man-pages/">Linux man-pages</a>
            <a href="https://www.gnu.org/software/bash/manual/">Bash manual</a>
            <a href="https://pubs.opengroup.org/onlinepubs/9699919799/">POSIX</a>
            <a href="https://docs.kernel.org/">Kernel documentation</a>
            <Link to="/progress">My learning</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
