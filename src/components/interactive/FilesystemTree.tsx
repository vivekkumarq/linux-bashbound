import { useState } from "react";
import { fsTree } from "../../data/fsTree";

/**
 * Interactive filesystem hierarchy.
 *
 * A real list of directories rendered as a tree, where selecting one explains
 * what belongs in it and why an engineer ends up there. Implemented as a
 * listbox so arrow keys work.
 */
export function FilesystemTree() {
  const [active, setActive] = useState(0);
  const entry = fsTree[active];

  function onKeyDown(event: React.KeyboardEvent) {
    const last = fsTree.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown") next = active === last ? 0 : active + 1;
    if (event.key === "ArrowUp") next = active === 0 ? last : active - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  return (
    <section className="fstree" aria-label="Filesystem hierarchy">
      <header>
        <p className="kicker">Interactive</p>
        <h3>The Linux tree</h3>
        <p className="muted">
          One tree, no drive letters. Pick a directory to see what belongs in it — and what does not.
        </p>
      </header>

      <div className="fstree-grid">
        <ul
          className="fstree-list"
          role="listbox"
          aria-label="Directories"
          aria-activedescendant={`fs-${active}`}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          {fsTree.map((item, i) => (
            <li key={item.path}>
              <button
                id={`fs-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                className={`fstree-item${i === active ? " is-active" : ""}`}
                onClick={() => setActive(i)}
              >
                <span className="fstree-branch" aria-hidden="true">
                  {i === fsTree.length - 1 ? "└──" : "├──"}
                </span>
                <code>{item.path}</code>
                {item.virtual ? <span className="fstree-tag">virtual</span> : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="fstree-detail" aria-live="polite">
          <h4>
            <code>{entry.path}</code>
          </h4>
          <p className="fstree-purpose">{entry.purpose}</p>
          <p>{entry.detail}</p>

          {entry.notable?.length ? (
            <>
              <h5>Worth knowing</h5>
              <dl className="fstree-notable">
                {entry.notable.map((n) => (
                  <div key={n.name}>
                    <dt>
                      <code>{n.name}</code>
                    </dt>
                    <dd>{n.what}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}

          {entry.realWorld ? (
            <p className="fstree-real">
              <strong>Where you meet it. </strong>
              {entry.realWorld}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
