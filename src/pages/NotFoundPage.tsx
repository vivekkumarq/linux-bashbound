import { Link, useLocation } from "react-router-dom";

/**
 * 404. Written as shell output rather than a generic error page — the path
 * that failed is shown the way the system would report it.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="notfound">
      <p className="kicker">Exit status 127</p>
      <h1>No such file or directory</h1>
      <pre className="notfound-shell" aria-label="Shell transcript">
        <span className="prompt">learner@bashbound:~$</span> cat <span className="nf-path">{pathname}</span>
        {"\n"}
        cat: {pathname}: No such file or directory
      </pre>
      <p className="muted">
        That route does not exist. Nothing is broken — the address is just wrong, or the page moved.
      </p>
      <div className="row" style={{ marginTop: 20 }}>
        <Link className="btn btn-primary" to="/">
          Back to home
        </Link>
        <Link className="btn btn-secondary" to="/roadmap">
          Open the roadmap
        </Link>
        <Link className="btn btn-ghost" to="/commands">
          Browse commands
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
        Tip: press <kbd>Ctrl</kbd>+<kbd>K</kbd> to search every lesson, command and question.
      </p>
    </div>
  );
}
