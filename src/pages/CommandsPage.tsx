import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { commands, getCommand } from "../data/commands";
import type { CommandCategory } from "../types";
import { CodeBlock } from "../components/CodeBlock";
import { scoreMatch } from "../utils/search";

const cats: CommandCategory[] = [
  "File",
  "Text Processing",
  "Networking",
  "Process",
  "System Administration",
  "Security",
  "Archive",
  "Shell",
  "Storage",
  "Package",
];

export function CommandsPage() {
  const { name } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const filtered = useMemo(() => {
    return commands.filter((c) => {
      if (cat !== "All" && c.category !== cat) return false;
      if (!q.trim()) return true;
      return scoreMatch(q, `${c.name} ${c.summary} ${c.purpose}`) > 0;
    });
  }, [q, cat]);

  const current = name ? getCommand(name) : filtered[0];

  if (name && !current) {
    return (
      <p>
        Unknown command. <Link to="/commands">Explorer</Link>
      </p>
    );
  }

  return (
    <div className="learn-layout">
      <aside>
        <h1 style={{ fontSize: 22 }}>Command explorer</h1>
        <input className="input" placeholder="Search grep, chmod…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ marginTop: 8 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option>All</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="sidebar-nav" style={{ marginTop: 12, maxHeight: "70vh", overflow: "auto" }}>
          {filtered.map((c) => (
            <Link key={c.name} to={`/commands/${c.name}`} className={c.name === current?.name ? "active" : ""}>
              {c.name}
            </Link>
          ))}
        </div>
      </aside>
      {current ? (
        <article>
          <p className="kicker">{current.category}</p>
          <h2>
            <code>{current.name}</code>
          </h2>
          <p>{current.summary}</p>
          {current.destructive ? <div className="callout danger">{current.warning}</div> : null}
          <p>
            <span className="badge">{current.posix ? "POSIX" : "Linux-common"}</span>
            {current.gnu ? <span className="badge">GNU extensions possible</span> : null}
          </p>
          <h3>Syntax</h3>
          <CodeBlock code={current.syntax} />
          <h3>Purpose</h3>
          <p>{current.purpose}</p>
          <h3>Common flags</h3>
          <ul>
            {current.flags.map((f) => (
              <li key={f.flag}>
                <code>{f.flag}</code> — {f.meaning}
              </li>
            ))}
          </ul>
          <h3>Examples</h3>
          {current.examples.map((e) => (
            <div key={e.command} style={{ marginBottom: 12 }}>
              <CodeBlock code={e.command} onTry={() => nav(`/terminal?cmd=${encodeURIComponent(e.command)}`)} />
              <p className="muted">{e.note}</p>
            </div>
          ))}
          <h3>Real-world use</h3>
          <p>{current.realWorld}</p>
          {current.mistakes?.length ? (
            <>
              <h3>Common mistakes</h3>
              <ul>
                {current.mistakes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          ) : null}
          {current.interview?.length ? (
            <>
              <h3>Interview questions</h3>
              <ul>
                {current.interview.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p>
            Related:{" "}
            {current.related.map((r) => (
              <Link key={r} className="badge" to={`/commands/${r}`}>
                {r}
              </Link>
            ))}
          </p>
        </article>
      ) : (
        <p>No commands match.</p>
      )}
    </div>
  );
}
