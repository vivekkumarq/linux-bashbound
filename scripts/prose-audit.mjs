/**
 * Ranks modules by how thin their writing is, so a rewrite can start with the
 * worst rather than with whatever is at the top of the file.
 *
 * Three signals, all of which were visibly true of the modules a reader
 * complained about:
 *  - too few concepts for the stated reading time;
 *  - a "simple" explanation that is shorter than the technical one, which
 *    usually means it is a definition rather than an explanation;
 *  - a high density of bare proper nouns, which is what a list of acronyms
 *    looks like when it is pretending to be a plain-English introduction.
 *
 * Not a quality judgement, just a worklist. Run with: node scripts/prose-audit.mjs
 */
import { rolldown } from "rolldown";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bundle = await rolldown({ input: "src/data/topics.ts", platform: "node", logLevel: "silent" });
const { output } = await bundle.generate({ format: "esm" });
const entry = join(mkdtempSync(join(tmpdir(), "bb-audit-")), "entry.mjs");
writeFileSync(entry, output[0].code);
const { topics } = await import(`file://${entry}`);

/** Capitalised words that are not sentence-initial: AIX, Solaris, System V. */
function properNounDensity(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const nouns = words.filter((w, i) => i > 0 && /^[A-Z][A-Za-z0-9.-]*$/.test(w) && !/^[A-Z]\.$/.test(w));
  return nouns.length / words.length;
}

const rows = topics.map((t) => {
  const simple = t.concepts.map((c) => c.simple);
  const avgSimple = Math.round(simple.join(" ").length / Math.max(1, simple.length));
  const avgTech = Math.round(t.concepts.map((c) => c.technical).join(" ").length / Math.max(1, t.concepts.length));
  const density = Math.max(...simple.map(properNounDensity), 0);
  const minutesPerConcept = Math.round(t.minutes / Math.max(1, t.concepts.length));

  // Higher is worse.
  let score = 0;
  if (t.concepts.length < 3) score += (3 - t.concepts.length) * 3;
  if (minutesPerConcept > 7) score += 3;
  if (avgSimple < avgTech) score += 3;
  if (avgSimple < 320) score += 2;
  if (density > 0.1) score += 3;

  return {
    slug: t.slug,
    level: t.level,
    concepts: t.concepts.length,
    minutes: t.minutes,
    avgSimple,
    avgTech,
    nounDensity: density.toFixed(2),
    score,
  };
});

rows.sort((a, b) => b.score - a.score || a.level - b.level);
console.table(rows);
console.log(
  `\n${rows.filter((r) => r.score >= 8).length} modules score 8+ (rewrite first), ` +
    `${rows.filter((r) => r.score >= 5 && r.score < 8).length} score 5-7, ` +
    `${rows.filter((r) => r.score < 5).length} look adequate.`,
);
