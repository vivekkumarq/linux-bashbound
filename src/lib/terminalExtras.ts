/**
 * The commands added on top of the original sandbox command set, plus the
 * helpers that let filters read piped input.
 *
 * Kept in its own module so terminalEngine.ts stays the command switch it
 * always was — this file is purely additive.
 */

import type { Node, TermState } from "./terminalEngine";
import { globToRegExp } from "./terminalShell";

/**
 * What a command produces. `output` is stdout, which pipes and `>` carry;
 * `error` is stderr, which goes to the terminal unless `2>` sends it
 * elsewhere. `status` is the exit status `$?` reports, 0 when left out.
 */
export interface Result {
  output: string;
  error?: string;
  status?: number;
  state: TermState;
}

export type Runner = (state: TermState, args: string[], stdin: string) => Result;

/* ---- Shared helpers ------------------------------------------------------ */

/**
 * A directory entry by name. Directories are plain objects, so a bare lookup
 * would also find Object.prototype members such as `constructor`.
 */
export function own(children: Record<string, Node>, name: string): Node | undefined {
  return Object.hasOwn(children, name) ? children[name] : undefined;
}

/** A command that failed: nothing on stdout, the message on stderr. */
export function fail(state: TermState, error: string, status = 1): Result {
  return { output: "", error, status, state };
}

export function stripTrailingNewline(text: string) {
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

/**
 * Command output as it would land in a file. Most commands here return their
 * lines without the final newline, but `cat` hands back a file verbatim, so
 * the newline is added only when it is missing.
 */
export function asFileText(text: string) {
  return text === "" || text.endsWith("\n") ? text : `${text}\n`;
}

/**
 * A POSIX basic regular expression in JavaScript syntax. In a BRE, ( ) { } + ?
 * and | are literal and their backslashed forms are the operators (the last
 * three as GNU extensions) — the reverse of JavaScript.
 */
export function breToJs(pattern: string) {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      out += "(){}+?|".includes(next) ? next : `\\${next}`;
      i += 1;
    } else {
      out += "(){}+?|".includes(ch) ? `\\${ch}` : ch;
    }
  }
  return out;
}

/** A tr set with its escapes, [:classes:] and a-z ranges spelled out. */
function trSet(set: string) {
  const range = (from: string, to: string) => {
    let acc = "";
    for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c += 1) acc += String.fromCharCode(c);
    return acc;
  };
  const classes: Record<string, string> = {
    lower: range("a", "z"),
    upper: range("A", "Z"),
    digit: range("0", "9"),
    alpha: range("a", "z") + range("A", "Z"),
    alnum: range("a", "z") + range("A", "Z") + range("0", "9"),
    space: " \t\n\r\v\f",
    blank: " \t",
  };
  const escapes: Record<string, string> = { n: "\n", t: "\t", r: "\r", "\\": "\\" };
  let out = "";
  for (let i = 0; i < set.length; i += 1) {
    const cls = /^\[:(\w+):\]/.exec(set.slice(i));
    if (cls && classes[cls[1]]) {
      out += classes[cls[1]];
      i += cls[0].length - 1;
      continue;
    }
    let ch = set[i];
    if (ch === "\\" && i + 1 < set.length) ch = escapes[set[(i += 1)]] ?? set[i];
    // A range such as a-z; a dash at either end is a literal dash.
    if (set[i + 1] === "-" && i + 2 < set.length) {
      out += range(ch, set[i + 2]);
      i += 2;
      continue;
    }
    out += ch;
  }
  return out;
}

export function lines(text: string) {
  const body = stripTrailingNewline(text);
  return body === "" ? [] : body.split("\n");
}

/* ---- New commands -------------------------------------------------------- */

function makeExtras(deps: {
  walk: (root: Node, path: string[]) => Node | null;
  resolve: (state: TermState, raw: string) => string[] | null;
  readInput: (state: TermState, files: string[], stdin: string) => { text: string; error?: string };
}): Record<string, Runner> {
  const { walk, resolve, readInput } = deps;

  const filter =
    (name: string, fn: (input: string[], flags: string, args: string[]) => string[]): Runner =>
    (state, args, stdin) => {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const files = args.filter((a) => !a.startsWith("-"));
      const read = readInput(state, files, stdin);
      if (read.error) return fail(state, `${name}: ${read.error}`);
      return { output: fn(lines(read.text), flags, args).join("\n"), state };
    };

  return {
    sort: filter("sort", (input, flags) => {
      const out = [...input].sort((a, b) =>
        flags.includes("n") ? Number.parseFloat(a) - Number.parseFloat(b) || a.localeCompare(b) : a.localeCompare(b),
      );
      if (flags.includes("r")) out.reverse();
      return flags.includes("u") ? [...new Set(out)] : out;
    }),

    uniq: filter("uniq", (input, flags) => {
      const out: string[] = [];
      let prev: string | null = null;
      let run = 0;
      const flush = () => {
        if (prev === null) return;
        if (flags.includes("d") && run < 2) return;
        if (flags.includes("u") && run > 1) return;
        out.push(flags.includes("c") ? `${String(run).padStart(4)} ${prev}` : prev);
      };
      for (const line of input) {
        if (line === prev) {
          run += 1;
          continue;
        }
        flush();
        prev = line;
        run = 1;
      }
      flush();
      return out;
    }),

    nl: filter("nl", (input) => input.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`)),

    tac: filter("tac", (input) => [...input].reverse()),

    cut: (state, args, stdin) => {
      let delim = "\t";
      let fields: string[] | null = null;
      const files: string[] = [];
      for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a.startsWith("-d")) delim = a.length > 2 ? a.slice(2) : args[(i += 1)] ?? "\t";
        else if (a.startsWith("-f")) fields = (a.length > 2 ? a.slice(2) : args[(i += 1)] ?? "1").split(",");
        else if (!a.startsWith("-")) files.push(a);
      }
      const read = readInput(state, files, stdin);
      if (read.error) return fail(state, `cut: ${read.error}`);
      if (!fields) return fail(state, "cut: you must specify a list of fields, e.g. -f1");
      const out = lines(read.text).map((line) => {
        const parts = line.split(delim);
        return fields!.map((f) => parts[Number(f) - 1] ?? "").join(delim);
      });
      return { output: out.join("\n"), state };
    },

    tr: (state, args, stdin) => {
      const flags = args.filter((a) => /^-[a-z]+$/.test(a)).join("");
      const sets = args.filter((a) => !/^-[a-z]+$/.test(a));
      if (!sets.length) return fail(state, "tr: missing operand");

      const from = trSet(sets[0]);
      const to = sets[1] ? trSet(sets[1]) : "";
      let out = "";
      for (const ch of stdin) {
        const i = from.indexOf(ch);
        if (flags.includes("d")) {
          if (i === -1) out += ch;
        } else if (i !== -1 && to) {
          out += to[Math.min(i, to.length - 1)];
        } else {
          out += ch;
        }
      }
      // -s squeezes runs of the characters in the last set given, not every
      // repeated character: `tr -s ' '` must leave "hello" alone.
      if (flags.includes("s")) {
        const squeeze = to || from;
        out = [...out].filter((ch, i, all) => !(i > 0 && ch === all[i - 1] && squeeze.includes(ch))).join("");
      }
      return { output: stripTrailingNewline(out), state };
    },

    sed: (state, args, stdin) => {
      // Only the s command is simulated; everything else gets an honest
      // message rather than a silently different result.
      let extended = false;
      let inPlace = false;
      let script: string | null = null;
      const files: string[] = [];
      for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === "-e") script = args[(i += 1)] ?? "";
        else if (a === "-E" || a === "-r" || a === "--regexp-extended") extended = true;
        else if (a === "-i" || a === "--in-place") inPlace = true;
        else if (a.startsWith("-")) return fail(state, `sed: option '${a}' is not simulated here (s/old/new/flags with -E, -i and -e is)`);
        else if (script === null) script = a;
        else files.push(a);
      }
      if (script === null) return fail(state, "Usage: sed [-E] [-i] s/regexp/replacement/[gi] [FILE]...");

      const m = /^s(.)((?:\\.|(?!\1).)*)\1((?:\\.|(?!\1).)*)\1([gi]*)$/s.exec(script);
      if (!m) return fail(state, `sed: only s/regexp/replacement/flags is simulated here, not '${script}'`);
      const [, , pattern, replacement, opts] = m;

      let re: RegExp;
      try {
        re = new RegExp(extended ? pattern : breToJs(pattern), `${opts.includes("g") ? "g" : ""}${opts.includes("i") ? "i" : ""}`);
      } catch {
        return fail(state, `sed: -e expression #1, char ${script.length}: invalid regular expression`);
      }
      // sed's replacement syntax, not JavaScript's: & is the match, \1 a group.
      const substitute = (match: string, groups: string[]) =>
        replacement.replace(/\\(\d)|\\n|\\(.)|&/gs, (token, digit?: string, escaped?: string) => {
          if (digit !== undefined) return groups[Number(digit) - 1] ?? "";
          if (token === "\\n") return "\n";
          if (escaped !== undefined) return escaped;
          return match;
        });
      // Applied line by line, so without g it replaces the first match on
      // every line rather than the first in the whole input.
      const edit = (text: string) =>
        lines(text)
          .map((line) => line.replace(re, (match, ...rest) => substitute(match, rest.slice(0, -2) as string[])))
          .join("\n");

      if (inPlace) {
        if (!files.length) return fail(state, "sed: no input files");
        let fs = state.fs;
        for (const name of files) {
          const read = readInput(state, [name], "");
          if (read.error) return fail(state, `sed: can't read ${read.error}`, 2);
          fs = writeFileAt(fs, resolve(state, name) ?? [], asFileText(edit(read.text)), false, walk);
        }
        return { output: "", state: { ...state, fs } };
      }

      const read = readInput(state, files, stdin);
      if (read.error) return fail(state, `sed: can't read ${read.error}`, 2);
      return { output: edit(read.text), state };
    },

    tee: (state, args, stdin) => {
      const append = args.includes("-a");
      const files = args.filter((a) => !a.startsWith("-"));
      let fs = state.fs;
      for (const name of files) {
        fs = writeFileAt(fs, resolve(state, name) ?? [], asFileText(stdin), append, walk);
      }
      return { output: stdin, state: { ...state, fs } };
    },

    find: (state, args) => {
      // Starting points come first; the expression starts at the first word
      // beginning with "-". With none given, find starts at ".".
      let i = 0;
      const starts: string[] = [];
      while (i < args.length && !args[i].startsWith("-")) starts.push(args[(i += 1) - 1]);
      if (!starts.length) starts.push(".");

      type Test = (node: Node, base: string) => boolean;
      const tests: Test[] = [];
      let maxDepth = Infinity;
      let minDepth = 0;
      for (; i < args.length; i += 1) {
        const a = args[i];
        const value = args[i + 1];
        const needsValue = ["-name", "-iname", "-type", "-size", "-maxdepth", "-mindepth"].includes(a);
        if (needsValue && value === undefined) return fail(state, `find: missing argument to '${a}'`);
        if (needsValue) i += 1;

        if (a === "-name" || a === "-iname") {
          const re = globToRegExp(value, a === "-iname");
          tests.push((_n, base) => re.test(base));
        } else if (a === "-type") {
          if (!/^[bcdpfls]$/.test(value)) return fail(state, `find: Unknown argument to -type: ${value}`);
          tests.push((n) => (n.kind === "dir" ? "d" : "f") === value);
        } else if (a === "-size") {
          // GNU rounds a size up to whole units before comparing, so
          // -size -1M only matches empty files.
          const m = /^([+-]?)(\d+)([bckwMG]?)$/.exec(value);
          if (!m) return fail(state, `find: invalid -size argument: '${value}'`);
          const unit = { "": 512, b: 512, c: 1, w: 2, k: 1024, M: 1024 ** 2, G: 1024 ** 3 }[m[3]]!;
          const want = Number(m[2]);
          tests.push((n) => {
            const size = Math.ceil((n.kind === "file" ? n.content.length : 4096) / unit);
            return m[1] === "+" ? size > want : m[1] === "-" ? size < want : size === want;
          });
        } else if (a === "-empty") {
          tests.push((n) => (n.kind === "file" ? n.content === "" : Object.keys(n.children).length === 0));
        } else if (a === "-maxdepth" || a === "-mindepth") {
          if (!/^\d+$/.test(value)) return fail(state, `find: Expected a positive decimal integer argument to ${a}, but got '${value}'`);
          if (a === "-maxdepth") maxDepth = Number(value);
          else minDepth = Number(value);
        } else if (a !== "-print") {
          return fail(
            state,
            `find: '${a}' is not simulated here (-name, -iname, -type, -size, -empty, -maxdepth, -mindepth and -print are)`,
          );
        }
      }

      const out: string[] = [];
      const errors: string[] = [];
      for (const start of starts) {
        const root = walk(state.fs, resolve(state, start) ?? []);
        if (!root) {
          errors.push(`find: '${start}': No such file or directory`);
          continue;
        }
        const visit = (node: Node, shown: string, depth: number) => {
          const base = shown === "/" ? "/" : shown.split("/").pop() || shown;
          if (depth >= minDepth && tests.every((t) => t(node, base))) out.push(shown);
          if (node.kind !== "dir" || depth >= maxDepth) return;
          for (const key of Object.keys(node.children).sort()) {
            visit(node.children[key], `${shown.replace(/\/$/, "")}/${key}`, depth + 1);
          }
        };
        visit(root, start.length > 1 ? start.replace(/\/+$/, "") : start, 0);
      }
      return { output: out.join("\n"), error: errors.join("\n") || undefined, status: errors.length ? 1 : 0, state };
    },

    tree: (state, args) => {
      const all = args.includes("-a");
      const start = args.find((a) => !a.startsWith("-")) ?? ".";
      const root = walk(state.fs, resolve(state, start) ?? []);
      if (!root) return fail(state, `tree: ${start}: No such file or directory`);
      const rows = [start];
      let dirs = 0;
      let files = 0;
      const visit = (node: Node, prefix: string) => {
        if (node.kind !== "dir") return;
        // Like ls, tree leaves dotfiles out unless -a asks for them.
        const keys = Object.keys(node.children)
          .filter((k) => all || !k.startsWith("."))
          .sort();
        keys.forEach((key, i) => {
          const last = i === keys.length - 1;
          rows.push(`${prefix}${last ? "└── " : "├── "}${key}`);
          const child = node.children[key];
          if (child.kind === "dir") {
            dirs += 1;
            visit(child, `${prefix}${last ? "    " : "│   "}`);
          } else {
            files += 1;
          }
        });
      };
      visit(root, "");
      rows.push("", `${dirs} director${dirs === 1 ? "y" : "ies"}, ${files} file${files === 1 ? "" : "s"}`);
      return { output: rows.join("\n"), state };
    },

    seq: (state, args) => {
      let separator = "\n";
      let equalWidth = false;
      const operands: string[] = [];
      for (let i = 0; i < args.length; i += 1) {
        if (args[i] === "-s") separator = args[(i += 1)] ?? "";
        else if (args[i] === "-w") equalWidth = true;
        else operands.push(args[i]);
      }
      if (!operands.length) return fail(state, "seq: missing operand");
      if (operands.length > 3) return fail(state, `seq: extra operand '${operands[3]}'`);
      const bad = operands.find((a) => !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(a));
      if (bad) return fail(state, `seq: invalid floating point argument: '${bad}'`);

      // seq FIRST INCREMENT LAST, with FIRST and INCREMENT defaulting to 1.
      const nums = operands.map(Number);
      const [first, step, last] = nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums;
      if (step === 0) return fail(state, "seq: invalid Zero increment value: '0'");
      const decimals = Math.max(0, ...operands.map((a) => a.split(".")[1]?.length ?? 0));

      // ponytail: capped so `seq 1000000000` cannot freeze the tab; a real
      // seq would keep printing until interrupted.
      const LIMIT = 10_000;
      const out: string[] = [];
      for (let i = 0; ; i += 1) {
        const value = first + i * step;
        if (step > 0 ? value > last + 1e-9 : value < last - 1e-9) break;
        if (out.length === LIMIT) {
          return { output: out.join(separator), error: `seq: stopped after ${LIMIT} numbers in Simulation Mode`, state };
        }
        out.push(value.toFixed(decimals));
      }
      if (equalWidth) {
        const width = Math.max(...out.map((n) => n.replace("-", "").length));
        for (let i = 0; i < out.length; i += 1) {
          const negative = out[i].startsWith("-");
          out[i] = (negative ? "-" : "") + out[i].replace("-", "").padStart(width, "0");
        }
      }
      return { output: out.join(separator), state };
    },

    basename: (state, args) => {
      const [path, suffix] = args;
      if (path === undefined) return fail(state, "basename: missing operand");
      const base = path.split("/").filter(Boolean).pop() ?? (path.startsWith("/") ? "/" : "");
      // `basename notes.txt .txt` drops the suffix, unless it is the whole name.
      return { output: suffix && base !== suffix && base.endsWith(suffix) ? base.slice(0, -suffix.length) : base, state };
    },

    dirname: (state, args) => {
      if (!args.length) return fail(state, "dirname: missing operand");
      // POSIX: trailing slashes go first, a bare name lives in ".", and
      // everything directly under / reports "/".
      const out = args.map((path) => {
        const trimmed = path.replace(/\/+$/, "");
        if (!trimmed) return path.startsWith("/") ? "/" : ".";
        const slash = trimmed.lastIndexOf("/");
        if (slash === -1) return ".";
        return trimmed.slice(0, slash).replace(/\/+$/, "") || "/";
      });
      return { output: out.join("\n"), state };
    },

    // Static but accurate-looking system views. They are labelled as sample
    // output in help so nobody mistakes them for live readings.
    ps: (state, args) => {
      const wide = args.join("").includes("e") || args.join("").includes("a");
      const rows = [
        "    PID TTY          TIME CMD",
        "      1 ?        00:00:04 systemd",
        "    412 ?        00:00:01 systemd-journald",
        "    688 ?        00:00:00 sshd",
        "   1180 ?        00:00:12 nginx",
        "   2451 pts/0    00:00:00 bash",
        "   2452 pts/0    00:00:00 ps",
      ];
      return { output: wide ? rows.join("\n") : [rows[0], rows[5], rows[6]].join("\n"), state };
    },

    df: (state, args) => ({
      output: args.join("").includes("h")
        ? "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        40G   26G   12G  69% /\ntmpfs           2.0G  1.2M  2.0G   1% /run"
        : "Filesystem     1K-blocks     Used Available Use% Mounted on\n/dev/sda1       41153024 27262976  12582912  69% /",
      state,
    }),

    free: (state, args) => ({
      output: args.join("").includes("h")
        ? "               total        used        free      shared  buff/cache   available\nMem:           3.8Gi       1.1Gi       890Mi        18Mi       1.9Gi       2.7Gi\nSwap:          2.0Gi          0B       2.0Gi"
        : "               total        used        free      shared  buff/cache   available\nMem:         4028132     1148216      912004       18432     1967912     2841220\nSwap:        2097148           0     2097148",
      state,
    }),

    uptime: (state) => ({
      output: " 09:20:14 up 2 days,  3:07,  1 user,  load average: 0.24, 0.31, 0.29",
      state,
    }),

    du: (state, args) => {
      const human = args.join("").includes("h");
      const start = args.find((a) => !a.startsWith("-")) ?? ".";
      const root = walk(state.fs, resolve(state, start) ?? []);
      if (!root) return fail(state, `du: cannot access '${start}': No such file or directory`);
      const size = (node: Node): number =>
        node.kind === "file"
          ? Math.max(4, Math.ceil(node.content.length / 1024) * 4)
          : 4 + Object.values(node.children).reduce((sum, c) => sum + size(c), 0);
      const total = size(root);
      return { output: `${human ? `${total}K` : total}\t${start}`, state };
    },
  };
}


/** Writes `content` at `path`, creating the file if it does not exist. */
export function writeFileAt(
  fs: Node,
  path: string[],
  content: string,
  append: boolean,
  walk: (root: Node, p: string[]) => Node | null,
): Node {
  // /dev/null swallows everything written to it.
  if (!path.length || path.join("/") === "dev/null") return fs;
  const clone = structuredClone(fs) as Node;
  const parent = walk(clone, path.slice(0, -1));
  if (!parent || parent.kind !== "dir") return fs;
  const name = path[path.length - 1];
  const existing = own(parent.children, name);
  const base = append && existing && existing.kind === "file" ? existing.content : "";
  parent.children[name] = { kind: "file", name, content: base + content, mode: "-rw-r--r--" };
  return clone;
}

export { makeExtras };
