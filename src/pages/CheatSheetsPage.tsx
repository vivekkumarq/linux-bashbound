import { Link, useParams } from "react-router-dom";
import { cheatSheets } from "../data/cheatsheets";

export function CheatSheetsPage() {
  const { slug } = useParams();
  const sheet = cheatSheets.find((s) => s.slug === slug) ?? cheatSheets[0];
  return (
    <div className="learn-layout">
      <aside className="sidebar-nav">
        {cheatSheets.map((s) => (
          <Link key={s.slug} to={`/cheatsheets/${s.slug}`} className={s.slug === sheet.slug ? "active" : ""}>
            {s.title}
          </Link>
        ))}
      </aside>
      <article>
        <h1>{sheet.title}</h1>
        <p className="muted">{sheet.description}</p>
        {sheet.groups.map((g) => (
          <section key={g.heading}>
            <h2>{g.heading}</h2>
            <table className="sheet-table">
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.item}>
                    <td style={{ fontFamily: "var(--font-code)", padding: "8px 12px 8px 0", whiteSpace: "nowrap" }}>
                      {r.item}
                    </td>
                    <td className="muted">{r.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </article>
    </div>
  );
}
