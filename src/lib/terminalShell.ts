/**
 * Shell-level behaviour for the sandbox: word splitting into pipeline stages,
 * output redirection, glob expansion and tab completion.
 *
 * This layer sits above terminalEngine's per-command logic. Keeping it
 * separate means the command table did not have to be rewritten to gain
 * pipes.
 *
 * Still a simulation: nothing is executed, and the only side effects are on
 * the in-memory filesystem.
 */

/**
 * A literal piece of a word, or a variable to look up when the command runs.
 * Expansion waits until then so that `export X=1; echo $X` sees the new value.
 */
export type Part = string | { name: string };

/**
 * One word after quote removal. `glob` is set only when a `*` or `?` appeared
 * outside quotes — the only case in which a shell expands it.
 */
export interface Word {
  parts: Part[];
  glob: boolean;
  /** Something in it was quoted, so it stays a word even if it expands to nothing. */
  quoted: boolean;
}

export interface Redirect {
  target: Word;
  append: boolean;
}

export interface Stage {
  words: Word[];
  redirects: Redirect[];
}

export interface ParsedLine {
  /** Pipelines separated by `;`, run one after another. */
  pipelines: Stage[][];
  error?: string;
}

/** The word with its variables filled in from `lookup`. */
export function wordText(word: Word, lookup: (name: string) => string) {
  return word.parts.map((p) => (typeof p === "string" ? p : lookup(p.name))).join("");
}

/** The word as typed, for checks that happen before anything is expanded. */
export function literal(word: Word) {
  return word.parts.every((p) => typeof p === "string") ? word.parts.join("") : null;
}

/** Reads the `$` expansion starting at line[i]. `end` is the index of its last character. */
function readVariable(line: string, i: number): { part: Part; end: number } {
  if (line[i + 1] === "{") {
    const close = line.indexOf("}", i + 2);
    if (close > i + 2) return { part: { name: line.slice(i + 2, close) }, end: close };
  }
  const name = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9?$#])/.exec(line.slice(i + 1))?.[0];
  return name ? { part: { name }, end: i + name.length } : { part: "$", end: i };
}

/** Words that open a compound command when they are the first word of one. */
const KEYWORDS = new Set(["for", "while", "until", "if", "case", "select", "function"]);

const CONTROL_FLOW = "Control flow is not simulated here. The Bash scripting module covers it: /learn/bash-scripting.";
const SUBSTITUTION = "Command substitution is not simulated here. See /learn/bash-scripting.";
const LISTS = "Command lists (&& and ||) are not simulated here. Separate commands with ; or run them one at a time.";

/**
 * Splits a command line into pipelines and stages the way a shell does: quotes
 * are removed but keep their contents together as one word, and `;`, `|` and
 * `>` only count as operators outside quotes. `$NAME`, `${NAME}` and a leading
 * `~` are recorded as variables (not inside single quotes) for the runner to
 * fill in.
 *
 * The words come back already split, so a command receives exactly the
 * arguments that were typed — `grep "disk full" log` passes one pattern
 * rather than two words that get joined and split again on the way.
 */
export function parseLine(line: string): ParsedLine {
  const pipelines: Stage[][] = [];
  let stages: Stage[] = [];
  let words: Word[] = [];
  let redirects: Redirect[] = [];
  let pending: { append: boolean } | null = null;
  let parts: Part[] = [];
  let text = "";
  let glob = false;
  let quoted = false;
  let inWord = false;

  const fail = (error: string): ParsedLine => ({ pipelines: [], error });

  const pushVariable = (part: Part) => {
    if (text) parts.push(text);
    text = "";
    parts.push(part);
    inWord = true;
  };

  const endWord = () => {
    if (!inWord) return;
    if (text) parts.push(text);
    const word: Word = { parts, glob, quoted };
    if (pending) {
      redirects.push({ target: word, append: pending.append });
      pending = null;
    } else {
      words.push(word);
    }
    parts = [];
    text = "";
    glob = false;
    quoted = false;
    inWord = false;
  };

  /** Closes the current stage; returns an error message if it was empty. */
  const endStage = (token: string): string | null => {
    endWord();
    if (pending) return "bash: syntax error near unexpected token `newline'";
    if (!words.length) return `bash: syntax error near unexpected token \`${token}'`;
    stages.push({ words, redirects });
    words = [];
    redirects = [];
    return null;
  };

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === "'") {
      const close = line.indexOf("'", i + 1);
      if (close === -1) return fail("bash: unexpected EOF while looking for matching `''");
      text += line.slice(i + 1, close);
      inWord = true;
      quoted = true;
      i = close;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      for (; j < line.length && line[j] !== '"'; j += 1) {
        const c = line[j];
        if (c === "`" || (c === "$" && line[j + 1] === "(")) return fail(SUBSTITUTION);
        // Inside double quotes a backslash only escapes the characters that
        // would otherwise be special there.
        if (c === "\\" && '$`"\\'.includes(line[j + 1] ?? "\n")) {
          text += line[j + 1];
          j += 1;
          continue;
        }
        if (c === "$") {
          const { part, end } = readVariable(line, j);
          if (typeof part === "string") text += part;
          else pushVariable(part);
          j = end;
          continue;
        }
        text += c;
      }
      if (j >= line.length) return fail('bash: unexpected EOF while looking for matching `"\'');
      inWord = true;
      quoted = true;
      i = j;
      continue;
    }

    if (ch === "\\") {
      if (i + 1 < line.length) {
        text += line[i + 1];
        inWord = true;
        quoted = true;
        i += 1;
      }
      continue;
    }

    if (/\s/.test(ch)) {
      endWord();
      continue;
    }

    if (ch === "|") {
      if (line[i + 1] === "|") return fail(LISTS);
      const error = endStage("|");
      if (error) return fail(error);
      continue;
    }

    if (ch === ";") {
      const error = endStage(";");
      if (error) return fail(error);
      pipelines.push(stages);
      stages = [];
      continue;
    }

    if (ch === "&" && line[i + 1] === "&") return fail(LISTS);
    if (ch === "`" || (ch === "$" && line[i + 1] === "(")) return fail(SUBSTITUTION);
    if (ch === "<" && line[i + 1] === "<") return fail("Here-documents are not simulated here.");

    if (ch === ">") {
      endWord();
      if (pending) return fail("bash: syntax error near unexpected token `>'");
      const append = line[i + 1] === ">";
      if (append) i += 1;
      pending = { append };
      continue;
    }

    if (ch === "$") {
      const { part, end } = readVariable(line, i);
      if (typeof part === "string") {
        text += part;
        inWord = true;
      } else {
        pushVariable(part);
      }
      i = end;
      continue;
    }

    // A tilde expands only at the start of a word, and only as ~ or ~/...
    if (ch === "~" && !inWord && /^(?:$|[\s/;|>])/.test(line.slice(i + 1))) {
      pushVariable({ name: "HOME" });
      continue;
    }

    if (ch === "*" || ch === "?") glob = true;
    text += ch;
    inWord = true;
  }

  // A trailing `;` is allowed, so only close a stage that has something in it.
  if (inWord || words.length || pending || stages.length) {
    const error = endStage("newline");
    if (error) return fail(error);
    pipelines.push(stages);
  }

  // A keyword only opens a compound command in command position, so
  // `grep if notes.txt` is an ordinary search.
  if (pipelines.flat().some((s) => KEYWORDS.has(literal(s.words[0]) ?? ""))) return fail(CONTROL_FLOW);

  return { pipelines };
}

/** Converts a shell glob to an anchored regular expression. */
export function globToRegExp(pattern: string): RegExp {
  let out = "^";
  for (const ch of pattern) {
    if (ch === "*") out += "[^/]*";
    else if (ch === "?") out += "[^/]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${out}$`);
}
