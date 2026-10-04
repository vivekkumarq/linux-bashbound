import { useId, useMemo } from "react";
import { Link } from "react-router-dom";
import { glossary, glossaryByTerm } from "../data/glossary";

/**
 * Prose with the jargon explained in place.
 *
 * The course was using words like userland, POSIX and GNU before anything
 * defined them, which is the single biggest reason the writing read as
 * unexplained. Rewriting each sentence to avoid the terms would be wrong —
 * these are the words the documentation and the interviewer will use, so the
 * reader does need them. What was missing was the definition at the moment of
 * first contact.
 *
 * The first mention of a term in each block becomes a button that opens its
 * definition. Later mentions are left alone: marking all thirteen uses of
 * "userland" on one page would be noise, not help.
 *
 * Built on the native popover API, so it sits in the top layer (no z-index
 * fights), closes on Escape or an outside click, and works on touch — none of
 * which a title attribute does.
 */

/** One regex for every term and alias, longest first so "user space" wins over "user". */
const termPattern = (() => {
  const keys = [...glossaryByTerm.keys()].sort((a, b) => b.length - a.length);
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
})();

function Term({ text, entry, id }: { text: string; entry: (typeof glossary)[number]; id: string }) {
  return (
    <span className="term-wrap">
      <button
        type="button"
        className="term"
        popoverTarget={id}
        aria-label={`${text}: show definition`}
        onClick={(e) => {
          // Place the panel under the word. Popovers live in the top layer, so
          // they cannot simply be positioned by an ancestor.
          const box = e.currentTarget.getBoundingClientRect();
          const panel = document.getElementById(id);
          if (!panel) return;
          const width = Math.min(320, window.innerWidth - 24);
          panel.style.width = `${width}px`;
          panel.style.left = `${Math.max(12, Math.min(box.left, window.innerWidth - width - 12))}px`;
          // Flip above the word when there is not room below.
          const below = window.innerHeight - box.bottom;
          if (below < 180) {
            panel.style.top = "auto";
            panel.style.bottom = `${window.innerHeight - box.top + 6}px`;
          } else {
            panel.style.bottom = "auto";
            panel.style.top = `${box.bottom + 6}px`;
          }
        }}
      >
        {text}
      </button>
      <span className="term-pop" id={id} popover="auto">
        <b>{entry.term}</b>
        <span>{entry.definition}</span>
        {entry.why ? <span className="term-why">{entry.why}</span> : null}
        {entry.topic ? (
          <Link className="term-link" to={`/learn/${entry.topic}`}>
            Read the module
          </Link>
        ) : null}
      </span>
    </span>
  );
}

export function Prose({ text, as = "p", className }: { text: string; as?: "p" | "span"; className?: string }) {
  const uid = useId();

  const parts = useMemo(() => {
    const out: (string | { text: string; key: string })[] = [];
    const seen = new Set<string>();
    let last = 0;

    for (const match of text.matchAll(termPattern)) {
      const key = match[0].toLowerCase();
      // Only the first mention in this block is marked.
      if (seen.has(key)) continue;
      const entry = glossaryByTerm.get(key);
      if (!entry) continue;
      seen.add(key);
      out.push(text.slice(last, match.index));
      out.push({ text: match[0], key });
      last = match.index + match[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text]);

  const body = parts.map((part, i) =>
    typeof part === "string" ? (
      part
    ) : (
      <Term key={`${part.key}-${i}`} text={part.text} entry={glossaryByTerm.get(part.key)!} id={`${uid}-${i}`} />
    ),
  );

  return as === "span" ? <span className={className}>{body}</span> : <p className={className}>{body}</p>;
}
