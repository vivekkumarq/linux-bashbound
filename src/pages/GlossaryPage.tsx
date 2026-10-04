import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { glossary } from "../data/glossary";

/**
 * Every term the course uses, defined in one place.
 *
 * The inline popovers answer "what does this word mean" while reading. This
 * page answers the other question — the one you have after an interview, when
 * you half-remember a word and want it settled.
 */

export function GlossaryPage() {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => [...glossary].sort((a, b) => a.term.localeCompare(b.term)), []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        (e.aka ?? []).some((a) => a.toLowerCase().includes(q)) ||
        e.definition.toLowerCase().includes(q) ||
        (e.why ?? "").toLowerCase().includes(q),
    );
  }, [query, sorted]);

  return (
    <div>
      <p className="kicker">Reference</p>
      <h1>Glossary</h1>
      <p className="muted learn-lede">
        The words the manuals and the interviewer will use. Several are historical accidents — nothing about{" "}
        <em>daemon</em> or <em>tty</em> tells you what it means — so where the name is the obstacle, the entry says
        where it came from.
      </p>

      <label className="field">
        <span className="sr-only">Search the glossary</span>
        <input
          type="search"
          className="input"
          placeholder="Search terms, for example POSIX or inode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <p className="mono-meta muted" style={{ marginTop: 12 }}>
        <span>
          {shown.length} of {glossary.length} terms
        </span>
      </p>

      {shown.length === 0 ? (
        <p className="muted">
          Nothing matches that. Try the <Link to="/commands">command reference</Link> if you are looking for a command
          rather than a term.
        </p>
      ) : (
        <div className="gloss-list">
          {shown.map((entry) => (
            <article className="gloss-item" key={entry.term} id={entry.term.toLowerCase().replace(/\s+/g, "-")}>
              <h2 className="gloss-term">
                {entry.term}
                {entry.aka?.length ? <span className="gloss-aka">also: {entry.aka.join(", ")}</span> : null}
              </h2>
              <div>
                <p className="gloss-def">{entry.definition}</p>
                {entry.why ? (
                  <p className="gloss-why">
                    <b>Why it is called that. </b>
                    {entry.why}
                  </p>
                ) : null}
                {entry.topic ? (
                  <p className="gloss-more">
                    <Link to={`/learn/${entry.topic}`}>Read the module that covers it →</Link>
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
