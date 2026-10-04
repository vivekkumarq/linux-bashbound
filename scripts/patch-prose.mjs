/**
 * Replaces individual prose fields inside src/data/topics.ts.
 *
 * The rewrite touches a few fields on a hundred-odd concepts. Re-emitting each
 * whole concept to change two of its fields is how typos get introduced into
 * the parts nobody meant to touch, so this patches named fields in place and
 * leaves everything else byte-identical.
 *
 * Input is a JSON file: [{ "concept": "<id>", "simple": "...", ... }]
 * Patchable fields are the plain-string ones, each identified by the field that
 * must follow it — the objects are written in a consistent order, so the next
 * field name is a reliable terminator.
 *
 *   node scripts/patch-prose.mjs patch.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/data/topics.ts";
/** field -> the field that always follows it in these objects. */
const FOLLOWS = {
  title: "simple",
  takeaway: "simple",
  simple: "technical",
  technical: "analogy",
  analogy: "example",
};

const patches = JSON.parse(readFileSync(process.argv[2], "utf8"));
let src = readFileSync(FILE, "utf8");
let applied = 0;

/** TS string literal, escaped, wrapped the way prettier would. */
function literal(field, value, indent) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const oneLine = `${indent}${field}: "${escaped}",`;
  if (oneLine.length <= 120) return oneLine;
  return `${indent}${field}:\n${indent}  "${escaped}",`;
}

for (const patch of patches) {
  const anchor = src.indexOf(`id: "${patch.concept}"`);
  if (anchor === -1) throw new Error(`No concept with id "${patch.concept}"`);

  for (const [field, value] of Object.entries(patch)) {
    if (field === "concept") continue;
    const next = FOLLOWS[field];
    if (!next) throw new Error(`Field "${field}" is not patchable`);

    const indent = "        ";
    const start = src.indexOf(`\n${indent}${field}:`, anchor);
    const nextStart = src.indexOf(`\n${indent}${next}:`, anchor);
    if (nextStart === -1) throw new Error(`Could not find "${next}" after ${patch.concept}`);

    if (start === -1 || start > nextStart) {
      // Field absent (takeaway usually): insert it before the following field.
      src = src.slice(0, nextStart) + "\n" + literal(field, value, indent) + src.slice(nextStart);
    } else {
      src = src.slice(0, start) + "\n" + literal(field, value, indent) + src.slice(nextStart);
    }
    applied += 1;
  }
}

writeFileSync(FILE, src);
console.log(`Patched ${applied} field(s) across ${patches.length} concept(s).`);
