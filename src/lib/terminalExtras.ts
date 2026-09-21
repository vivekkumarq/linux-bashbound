/**
 * The commands added on top of the original sandbox command set, plus the
 * helpers that let filters read piped input.
 *
 * Kept in its own module so terminalEngine.ts stays the command switch it
 * always was — this file is purely additive.
 */

import type { Node, TermState } from "./terminalEngine";

export type Runner = (state: TermState, args: string[], stdin: string) => { output: string; state: TermState };

/* ---- Shared helpers ------------------------------------------------------ */

export function stripTrailingNewline(text: string) {
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

/** Parses `-n 5`, `-n5` and the bare `-5` form used by head and tail. */
export function countFlag(args: string[], fallback: number) {
  const joined = args.find((a) => /^-n\d+$/.test(a));
  if (joined) return Number(joined.slice(2)) || fallback;
  const bare = args.find((a) => /^-\d+$/.test(a));
  if (bare) return Number(bare.slice(1)) || fallback;
  const idx = args.indexOf("-n");
  if (idx !== -1 && args[idx + 1]) return Number(args[idx + 1]) || fallback;
  return fallback;
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
      if (read.error) return { output: `${name}: ${read.error}`, state };
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
      if (read.error) return { output: `cut: ${read.error}`, state };
      if (!fields) return { output: "cut: you must specify a list of fields, e.g. -f1", state };
      const out = lines(read.text).map((line) => {
        const parts = line.split(delim);
        return fields!.map((f) => parts[Number(f) - 1] ?? "").join(delim);
      });
      return { output: out.join("\n"), state };
    },

    tr: (state, args, stdin) => {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const sets = args.filter((a) => !a.startsWith("-"));
      if (!sets.length) return { output: "tr: usage: tr [-ds] SET1 [SET2]", state };

      const expand = (set: string) =>
        set.replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, (_m, from: string, to: string) => {
          let acc = "";
          for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c += 1) acc += String.fromCharCode(c);
          return acc;
        });

      const from = expand(sets[0]);
      const to = sets[1] ? expand(sets[1]) : "";
      let out = "";
      for (const ch of stdin) {
        const i = from.indexOf(ch);
        if (flags.includes("d")) {
          if (i === -1) out += ch;
        } else if (i !== -1) {
          out += to[Math.min(i, to.length - 1)] ?? ch;
        } else {
          out += ch;
        }
      }
      if (flags.includes("s")) out = out.replace(/(.)\1+/g, "$1");
      return { output: stripTrailingNewline(out), state };
    },

    sed: (state, args, stdin) => {
      const expr = args.find((a) => a.startsWith("s"));
      const files = args.filter((a) => !a.startsWith("-") && a !== expr);
      if (!expr) return { output: "sed: this sandbox supports s/pattern/replacement/flags only", state };
      const m = /^s(.)(.*?)\1(.*?)\1([gi]*)$/.exec(expr);
      if (!m) return { output: `sed: unsupported expression '${expr}' (try s/old/new/g)`, state };
      const read = readInput(state, files, stdin);
      if (read.error) return { output: `sed: ${read.error}`, state };
      try {
        const re = new RegExp(m[2], `${m[4].includes("g") ? "g" : ""}${m[4].includes("i") ? "i" : ""}m`);
        return { output: stripTrailingNewline(read.text).replace(re, m[3]), state };
      } catch {
        return { output: `sed: invalid regular expression '${m[2]}'`, state };
      }
    },

    tee: (state, args, stdin) => {
      const append = args.includes("-a");
      const files = args.filter((a) => !a.startsWith("-"));
      let fs = state.fs;
      for (const name of files) {
        fs = writeFileAt(fs, resolve(state, name) ?? [], stdin, append, walk);
      }
      return { output: stdin, state: { ...state, fs } };
    },

    find: (state, args) => {
      const start = args.find((a) => !a.startsWith("-")) ?? ".";
      const nameIdx = args.indexOf("-name");
      const typeIdx = args.indexOf("-type");
      const pattern = nameIdx !== -1 ? args[nameIdx + 1] : null;
      const wantType = typeIdx !== -1 ? args[typeIdx + 1] : null;

      const root = walk(state.fs, resolve(state, start) ?? []);
      if (!root) return { output: `find: '${start}': No such file or directory`, state };

      const re = pattern ? globToRe(pattern) : null;
      const out: string[] = [];
      const visit = (node: Node, shown: string) => {
        const base = shown.split("/").pop() || shown;
        const t = node.kind === "dir" ? "d" : "f";
        if ((!re || re.test(base)) && (!wantType || wantType === t)) out.push(shown || ".");
        if (node.kind !== "dir") return;
        for (const key of Object.keys(node.children).sort()) {
          visit(node.children[key], `${shown === "/" ? "" : shown}/${key}`);
        }
      };
      visit(root, start === "/" ? "" : start.replace(/\/$/, ""));
      return { output: out.join("\n"), state };
    },

    tree: (state, args) => {
      const start = args.find((a) => !a.startsWith("-")) ?? ".";
      const root = walk(state.fs, resolve(state, start) ?? []);
      if (!root) return { output: `tree: ${start}: No such file or directory`, state };
      const rows = [start];
      let dirs = 0;
      let files = 0;
      const visit = (node: Node, prefix: string) => {
        if (node.kind !== "dir") return;
        const keys = Object.keys(node.children).sort();
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
      rows.push("", `${dirs} directories, ${files} files`);
      return { output: rows.join("\n"), state };
    },

    seq: (state, args) => {
      const nums = args.map(Number).filter((n) => !Number.isNaN(n));
      const [from, to] = nums.length === 1 ? [1, nums[0]] : nums;
      if (to === undefined) return { output: "seq: usage: seq [FIRST] LAST", state };
      const out: number[] = [];
      for (let i = from; i <= to; i += 1) out.push(i);
      return { output: out.join("\n"), state };
    },

    basename: (state, args) => ({
      output: (args[0] ?? "").split("/").filter(Boolean).pop() ?? "/",
      state,
    }),

    dirname: (state, args) => {
      const parts = (args[0] ?? "").split("/");
      parts.pop();
      return { output: parts.join("/") || "/", state };
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
      if (!root) return { output: `du: cannot access '${start}': No such file or directory`, state };
      const size = (node: Node): number =>
        node.kind === "file"
          ? Math.max(4, Math.ceil(node.content.length / 1024) * 4)
          : 4 + Object.values(node.children).reduce((sum, c) => sum + size(c), 0);
      const total = size(root);
      return { output: `${human ? `${total}K` : total}\t${start}`, state };
    },
  };
}

function globToRe(pattern: string) {
  let out = "^";
  for (const ch of pattern) {
    if (ch === "*") out += "[^/]*";
    else if (ch === "?") out += "[^/]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${out}$`);
}

/** Writes `content` at `path`, creating the file if it does not exist. */
export function writeFileAt(
  fs: Node,
  path: string[],
  content: string,
  append: boolean,
  walk: (root: Node, p: string[]) => Node | null,
): Node {
  if (!path.length) return fs;
  const clone = structuredClone(fs) as Node;
  const parent = walk(clone, path.slice(0, -1));
  if (!parent || parent.kind !== "dir") return fs;
  const name = path[path.length - 1];
  const existing = parent.children[name];
  const base = append && existing && existing.kind === "file" ? existing.content : "";
  parent.children[name] = { kind: "file", name, content: base + content, mode: "-rw-r--r--" };
  return clone;
}

export { makeExtras };
