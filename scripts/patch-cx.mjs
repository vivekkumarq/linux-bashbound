/**
 * Fills in the per-concept content that cx() was faking.
 *
 * cx() takes its arguments positionally and each call is one long line, so
 * editing by hand is how you silently shift an argument and swap a concept's
 * analogy with its technical explanation. This scans the call's top-level
 * arguments properly, replaces the named ones, and appends the `real` object
 * that overrides the placeholder mistakes, practices and exercise.
 *
 * Input: [{ "id": "...", "simple": "...", "real": { mistakes, practices, exercise } }]
 *   node scripts/patch-cx.mjs patch.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/data/extraConceptsMore.ts";
/** Positional order of cx(), for the args this script may replace. */
const POS = { id: 0, title: 1, simple: 2, technical: 3, analogy: 4 };

/** Split a call's argument list at top-level commas, respecting strings and brackets. */
function splitArgs(text) {
  const out = [];
  let depth = 0;
  let start = 0;
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
    else if (ch === "," && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

const str = (v) => JSON.stringify(v);

const patches = JSON.parse(readFileSync(process.argv[2], "utf8"));
let src = readFileSync(FILE, "utf8");
let count = 0;

for (const patch of patches) {
  const needle = `cx("${patch.id}"`;
  const at = src.indexOf(needle);
  if (at === -1) throw new Error(`No cx() call for id "${patch.id}"`);

  // Find the matching close paren for this call.
  let depth = 0;
  let quote = null;
  let end = -1;
  for (let i = at + 2; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`Unbalanced cx() for "${patch.id}"`);

  const open = src.indexOf("(", at);
  const args = splitArgs(src.slice(open + 1, end));
  if (args.length < 12) throw new Error(`cx("${patch.id}") has ${args.length} args, expected 12+`);

  for (const [field, index] of Object.entries(POS)) {
    if (patch[field] === undefined) continue;
    args[index] = str(patch[field]);
  }

  // The `real` override is the 13th argument; replace it if already present.
  if (patch.real) {
    const real =
      `{ mistakes: [${patch.real.mistakes.map(str).join(", ")}], ` +
      `practices: [${patch.real.practices.map(str).join(", ")}], ` +
      `exercise: { prompt: ${str(patch.real.exercise.prompt)}, solution: ${str(patch.real.exercise.solution)} } }`;
    if (args.length >= 13) args[12] = real;
    else args.push(real);
  }

  src = src.slice(0, open + 1) + args.map((a) => a.trim()).join(", ") + src.slice(end);
  count += 1;
}

writeFileSync(FILE, src);
console.log(`Patched ${count} cx() concept(s).`);
