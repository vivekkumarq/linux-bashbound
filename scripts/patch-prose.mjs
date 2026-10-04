/**
 * Replaces individual prose fields on object-literal concepts.
 *
 * The rewrite touches a few fields on a hundred-odd concepts. Re-emitting a
 * whole concept to change two of its fields is how typos reach the parts
 * nobody meant to touch, so this patches named fields in place and leaves
 * everything else byte-identical.
 *
 * Concepts live in two files with different indentation, so the indent is
 * detected from the file rather than assumed. The positional cx() concepts in
 * extraConceptsMore.ts are a different shape and have their own patcher.
 *
 * Input: [{ "concept": "<id>", "simple": "...", "takeaway": "..." }]
 *   node scripts/patch-prose.mjs patch.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILES = ["src/data/topics.ts", "src/data/extraConcepts.ts"];

/** field -> the field that always follows it, used as the terminator. */
const FOLLOWS = {
  title: "simple",
  takeaway: "simple",
  simple: "technical",
  technical: "analogy",
  analogy: "example",
};

/** A TS string literal, wrapped onto its own line when prettier would. */
function literal(field, value, indent) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const oneLine = `${indent}${field}: "${escaped}",`;
  return oneLine.length <= 120 ? oneLine : `${indent}${field}:\n${indent}  "${escaped}",`;
}

const patches = JSON.parse(readFileSync(process.argv[2], "utf8"));
const sources = new Map(FILES.map((f) => [f, readFileSync(f, "utf8")]));
let applied = 0;

for (const patch of patches) {
  const file = FILES.find((f) => sources.get(f).includes(`id: "${patch.concept}"`));
  if (!file) throw new Error(`No concept with id "${patch.concept}" in ${FILES.join(" or ")}`);
  let src = sources.get(file);

  for (const [field, value] of Object.entries(patch)) {
    if (field === "concept") continue;
    const next = FOLLOWS[field];
    if (!next) throw new Error(`Field "${field}" is not patchable`);

    // Re-anchor every time: an earlier replacement shifts all later offsets.
    const anchor = src.indexOf(`id: "${patch.concept}"`);
    const nextRe = /\n(\s+)([a-zA-Z]+):/g;
    nextRe.lastIndex = anchor;
    let nextStart = -1;
    let indent = null;
    for (let m = nextRe.exec(src); m; m = nextRe.exec(src)) {
      if (m[2] === next) {
        nextStart = m.index;
        indent = m[1];
        break;
      }
    }
    if (nextStart === -1) throw new Error(`Could not find "${next}" after ${patch.concept}`);

    const start = src.indexOf(`\n${indent}${field}:`, anchor);
    if (start === -1 || start > nextStart) {
      // Field absent (takeaway usually): insert it before the following field.
      src = src.slice(0, nextStart) + "\n" + literal(field, value, indent) + src.slice(nextStart);
    } else {
      src = src.slice(0, start) + "\n" + literal(field, value, indent) + src.slice(nextStart);
    }
    applied += 1;
  }
  sources.set(file, src);
}

for (const [file, src] of sources) writeFileSync(file, src);
console.log(`Patched ${applied} field(s) across ${patches.length} concept(s).`);
