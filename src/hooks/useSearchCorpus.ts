import { useEffect, useState } from "react";

export interface SearchEntry {
  href: string;
  title: string;
  kind: string;
  /** Pre-joined text the matcher scores against. */
  haystack: string;
  /** Nudges a kind up the results. */
  bonus: number;
}

/**
 * The corpus behind the header search and the command palette.
 *
 * It is loaded on idle rather than imported at the top of the navbar. That one
 * change keeps the lesson corpus and the 1,282-question bank — around 360 kB —
 * off the critical path of every single page load, while still having the
 * index ready long before anyone finishes typing a query.
 *
 * Built once per session and shared by both consumers.
 */
let cache: SearchEntry[] | null = null;
let inflight: Promise<SearchEntry[]> | null = null;

async function build(): Promise<SearchEntry[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const [topicsMod, commandsMod, sheetsMod, questionsMod] = await Promise.all([
      import("../data/topics"),
      import("../data/commands"),
      import("../data/cheatsheets"),
      import("../data/questions"),
    ]);

    const entries: SearchEntry[] = [];

    for (const t of topicsMod.topics) {
      entries.push({
        href: `/learn/${t.slug}`,
        title: t.title,
        kind: "Module",
        haystack: `${t.title} ${t.summary} ${t.slug}`,
        bonus: 1,
      });
    }

    for (const c of commandsMod.commands) {
      entries.push({
        href: `/commands/${c.name}`,
        title: c.name,
        kind: "Command",
        haystack: `${c.name} ${c.summary} ${c.purpose}`,
        bonus: 2,
      });
    }

    for (const s of sheetsMod.cheatSheets) {
      entries.push({
        href: `/cheatsheets/${s.slug}`,
        title: s.title,
        kind: "Cheat sheet",
        haystack: `${s.title} ${s.description}`,
        bonus: 0,
      });
    }

    for (const q of questionsMod.questions) {
      entries.push({
        href: `/interview/${q.id}`,
        title: q.question,
        kind: "Interview",
        haystack: `${q.question} ${q.tags.join(" ")}`,
        bonus: -1,
      });
    }

    cache = entries;
    inflight = null;
    return entries;
  })();

  return inflight;
}

/** Kicks the build off without waiting for it. */
export function warmSearchCorpus() {
  void build();
}

export function useSearchCorpus(): SearchEntry[] | null {
  const [corpus, setCorpus] = useState<SearchEntry[] | null>(cache);

  useEffect(() => {
    if (corpus) return undefined;
    let cancelled = false;

    // After first paint, never before it.
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => void build().then((c) => !cancelled && setCorpus(c)), {
            timeout: 2500,
          })
        : window.setTimeout(() => void build().then((c) => !cancelled && setCorpus(c)), 900);

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === "function" && typeof idle === "number") {
        cancelIdleCallback(idle);
      } else {
        clearTimeout(idle as number);
      }
    };
  }, [corpus]);

  return corpus;
}
