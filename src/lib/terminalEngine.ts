import { countFlag, makeExtras, stripTrailingNewline, writeFileAt, type Runner } from "./terminalExtras";
import { globToRegExp, hasGlob, parseLine, unsupportedSyntax } from "./terminalShell";

export type Node =
  | { kind: "dir"; name: string; children: Record<string, Node>; mode: string }
  | { kind: "file"; name: string; content: string; mode: string };

export interface TermState {
  cwd: string[];
  home: string[];
  env: Record<string, string>;
  history: string[];
  fs: Node;
}

function dir(name: string, children: Node[] = [], mode = "drwxr-xr-x"): Node {
  const rec: Record<string, Node> = {};
  for (const c of children) rec[c.name] = c;
  return { kind: "dir", name, children: rec, mode };
}

function file(name: string, content: string, mode = "-rw-r--r--"): Node {
  return { kind: "file", name, content, mode };
}

export function initialFs(): Node {
  return dir("/", [
    dir("home", [
      dir("student", [
        dir("Documents", [file("notes.txt", "Welcome to Linux BashBound.\nPractice safely in simulation mode.\n")]),
        dir("Downloads"),
        dir("projects", [file("readme.md", "# projects\n")]),
        file(".bashrc", "export PATH=/usr/local/bin:/usr/bin:/bin\n"),
      ]),
    ]),
    dir("etc", [
      file("hostname", "bashbound\n"),
      file("os-release", 'NAME="Linux BashBound Lab"\nID=bashbound\n'),
      file("passwd", "root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:Student:/home/student:/bin/bash\n"),
    ]),
    dir("tmp"),
    dir("usr", [dir("bin"), dir("local", [dir("bin")])]),
    dir("var", [dir("log", [file("syslog", "INFO boot complete\nERROR disk simulated\nINFO ok\n")])]),
  ]);
}

export function freshState(): TermState {
  return {
    cwd: ["home", "student"],
    home: ["home", "student"],
    env: {
      HOME: "/home/student",
      USER: "student",
      PATH: "/usr/local/bin:/usr/bin:/bin",
      PWD: "/home/student",
    },
    history: [],
    fs: initialFs(),
  };
}

function walk(root: Node, path: string[]): Node | null {
  let n = root;
  for (const p of path) {
    if (n.kind !== "dir") return null;
    const next = n.children[p];
    if (!next) return null;
    n = next;
  }
  return n;
}

function resolve(state: TermState, raw: string): string[] | null {
  if (!raw || raw === ".") return [...state.cwd];
  if (raw === "~" || raw.startsWith("~/")) {
    const rest = raw === "~" ? [] : raw.slice(2).split("/").filter(Boolean);
    return [...state.home, ...rest];
  }
  const parts = raw.split("/").filter((p, i) => !(p === "" && i !== 0));
  const abs = raw.startsWith("/");
  const out = abs ? [] : [...state.cwd];
  const segs = raw.startsWith("/") ? raw.split("/").filter(Boolean) : parts;
  for (const s of segs) {
    if (s === "." || s === "") continue;
    if (s === "..") {
      out.pop();
      continue;
    }
    out.push(s);
  }
  return out;
}

function parentAndName(path: string[]) {
  if (!path.length) return { parent: [] as string[], name: "" };
  return { parent: path.slice(0, -1), name: path[path.length - 1] };
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: "'" | '"' | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      q = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function promptPath(state: TermState) {
  const p = "/" + state.cwd.join("/");
  if (p === "/home/student") return "~";
  return p || "/";
}

export const SIMULATED = [
  "help",
  "clear",
  "reset",
  "pwd",
  "whoami",
  "hostname",
  "uname",
  "id",
  "date",
  "env",
  "export",
  "history",
  "echo",
  "printf",
  "ls",
  "cd",
  "mkdir",
  "touch",
  "cat",
  "head",
  "tail",
  "wc",
  "grep",
  "rm",
  "cp",
  "mv",
  "chmod",
  "ln",
  "stat",
  "file",
  "type",
  "which",
  "man",
];

/**
 * Runs one simple command (no pipes, no redirection).
 *
 * `stdin` is the previous stage's output when this command is part of a
 * pipeline. Filters fall back to it when given no file operand, which is what
 * makes `cat file | grep x` behave the way it does on a real shell.
 *
 * runCommand() below is the entry point; it handles the shell syntax and then
 * calls in here per stage.
 */
function runBuiltin(
  state: TermState,
  line: string,
  stdin = "",
): { output: string; state: TermState } {
  const trimmed = line.trim();
  if (!trimmed) return { output: "", state };
  const next: TermState = {
    ...state,
    env: { ...state.env },
    cwd: [...state.cwd],
    history: state.history,
  };
  const argv = tokenize(trimmed);
  const cmd = argv[0];
  const args = argv.slice(1);

  const extra = EXTRA[cmd];
  if (extra) return extra(next, args, stdin);

  switch (cmd) {
    case "help":
      return {
        output: [
          "Simulation Mode — an in-browser lab. Nothing here runs on your machine.",
          "",
          "  Files     ls cd pwd mkdir touch cat head tail stat file cp mv rm ln chmod du tree find",
          "  Text      grep sed cut tr sort uniq wc nl tac tee seq basename dirname",
          "  System    whoami id uname hostname env export date history ps df free uptime type which man",
          "  Shell     help clear reset",
          "",
          "  Pipes     cat /var/log/syslog | grep ERROR | wc -l",
          "  Redirect  echo hi > out.txt     and     echo more >> out.txt",
          "  Globs     ls *.txt",
          "  Tab       completes commands and paths",
          "",
          "ps, df, free and uptime print fixed sample output — illustrations, not live readings.",
          "Control flow, command substitution and && are not simulated; the Bash module covers those.",
          "Destructive paths such as / are refused.",
        ].join("\n"),
        state: next,
      };
    case "clear":
      return { output: "__CLEAR__", state: next };
    case "reset":
      return { output: "Environment reset.", state: freshState() };
    case "pwd":
      next.env.PWD = "/" + next.cwd.join("/");
      return { output: next.env.PWD || "/", state: next };
    case "whoami":
      return { output: next.env.USER, state: next };
    case "hostname":
      return { output: "bashbound", state: next };
    case "uname": {
      if (args.includes("-a")) return { output: "Linux bashbound 6.8.0-lab x86_64 GNU/Linux", state: next };
      if (args.includes("-r")) return { output: "6.8.0-lab", state: next };
      if (args.includes("-s") || args.length === 0) return { output: "Linux", state: next };
      return { output: "Linux", state: next };
    }
    case "id":
      return { output: "uid=1000(student) gid=1000(student) groups=1000(student)", state: next };
    case "date":
      return { output: new Date().toUTCString(), state: next };
    case "env":
      return {
        output: Object.entries(next.env)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n"),
        state: next,
      };
    case "history":
      return {
        output: next.history.map((h, i) => `${String(i + 1).padStart(4, " ")}  ${h}`).join("\n"),
        state: next,
      };
    case "echo":
      return { output: args.join(" ").replace(/^["']|["']$/g, ""), state: next };
    case "ls": {
      const long = args.some((a) => /^-[a-z]*l/.test(a));
      const all = args.some((a) => /^-[a-z]*a/.test(a));
      // Every non-flag word is an operand. A glob expands to many of them, so
      // listing only the first would drop most of the match.
      const targets = args.filter((a) => !a.startsWith("-"));
      const operands = targets.length ? targets : ["."];

      const describe = (name: string, node: Node) =>
        long
          ? `${node.mode}  student student  ${node.kind === "file" ? node.content.length : 4096}  ${name}`
          : name;

      const blocks: string[] = [];
      const errors: string[] = [];
      const loose: string[] = [];

      for (const target of operands) {
        const path = resolve(next, target);
        const node = path ? walk(next.fs, path) : null;
        if (!node) {
          errors.push(`ls: cannot access '${target}': No such file or directory`);
          continue;
        }
        if (node.kind === "file") {
          loose.push(describe(target, node));
          continue;
        }

        const names = Object.keys(node.children).sort();
        const shown = all ? [".", "..", ...names] : names;
        const rows = shown.map((name) => {
          if (name === "." || name === "..") return long ? `drwxr-xr-x  student student  4096  ${name}` : name;
          return describe(name, node.children[name]);
        });
        const body = long ? rows.join("\n") : rows.join("  ");
        // Only label directories when more than one thing is being listed.
        blocks.push(operands.length > 1 ? `${target}:\n${body}` : body);
      }

      const parts = [
        ...errors,
        ...(loose.length ? [long ? loose.join("\n") : loose.join("  ")] : []),
        ...blocks,
      ];
      return { output: parts.join("\n\n"), state: next };
    }
    case "cd": {
      const dest = args[0] ?? "~";
      const path = resolve(next, dest);
      if (!path) return { output: "cd: path error", state: next };
      const node = walk(next.fs, path);
      if (!node || node.kind !== "dir") return { output: `cd: ${dest}: No such directory`, state: next };
      next.cwd = path;
      next.env.PWD = "/" + path.join("/");
      return { output: "", state: next };
    }
    case "mkdir": {
      const pflag = args.includes("-p");
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return { output: "mkdir: missing operand", state: next };
      for (const name of names) {
        const path = resolve(next, name);
        if (!path) continue;
        const { parent, name: base } = parentAndName(path);
        let parentNode = walk(next.fs, parent);
        if ((!parentNode || parentNode.kind !== "dir") && pflag) {
          let cur = next.fs;
          for (const seg of path) {
            if (cur.kind !== "dir") return { output: "mkdir: not a directory", state: next };
            if (!cur.children[seg]) cur.children[seg] = dir(seg);
            cur = cur.children[seg];
          }
          continue;
        }
        if (!parentNode || parentNode.kind !== "dir") return { output: `mkdir: cannot create directory '${name}'`, state: next };
        if (parentNode.children[base] && !pflag) return { output: `mkdir: cannot create directory '${name}': File exists`, state: next };
        if (!parentNode.children[base]) parentNode.children[base] = dir(base);
      }
      return { output: "", state: next };
    }
    case "touch": {
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return { output: "touch: missing file operand", state: next };
      for (const name of names) {
        const path = resolve(next, name)!;
        const { parent, name: base } = parentAndName(path);
        const parentNode = walk(next.fs, parent);
        if (!parentNode || parentNode.kind !== "dir") return { output: `touch: cannot touch '${name}'`, state: next };
        if (!parentNode.children[base]) parentNode.children[base] = file(base, "");
      }
      return { output: "", state: next };
    }
    case "cat": {
      const read = readInput(next, args, stdin);
      if (read.error) return { output: `cat: ${read.error}`, state: next };
      return { output: read.text, state: next };
    }
    case "head":
    case "tail": {
      const count = countFlag(args, 10);
      const files = args.filter((a) => !a.startsWith("-") && !/^\d+$/.test(a));
      const read = readInput(next, files, stdin);
      if (read.error) return { output: `${cmd}: ${read.error}`, state: next };
      const lines = stripTrailingNewline(read.text).split("\n");
      const slice = cmd === "head" ? lines.slice(0, count) : lines.slice(-count);
      return { output: slice.join("\n"), state: next };
    }
    case "wc": {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const files = args.filter((a) => !a.startsWith("-"));
      const read = readInput(next, files, stdin);
      if (read.error) return { output: `wc: ${read.error}`, state: next };
      const text = read.text;
      const lineCount = text === "" ? 0 : stripTrailingNewline(text).split("\n").length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const label = files.length === 1 ? ` ${files[0]}` : "";
      if (flags.includes("l")) return { output: `${lineCount}${label}`, state: next };
      if (flags.includes("w")) return { output: `${words}${label}`, state: next };
      if (flags.includes("c")) return { output: `${text.length}${label}`, state: next };
      return { output: `${lineCount} ${words} ${text.length}${label}`, state: next };
    }
    case "grep": {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const positional = args.filter((a) => !a.startsWith("-"));
      const pat = positional[0];
      if (!pat) return { output: "grep: usage: grep [-ivnc] PATTERN [FILE...]", state: next };
      const read = readInput(next, positional.slice(1), stdin);
      if (read.error) return { output: `grep: ${read.error}`, state: next };

      let re: RegExp;
      try {
        re = new RegExp(pat, flags.includes("i") ? "i" : "");
      } catch {
        return { output: `grep: ${pat}: invalid regular expression`, state: next };
      }

      const invert = flags.includes("v");
      const hits: string[] = [];
      stripTrailingNewline(read.text)
        .split("\n")
        .forEach((l, i) => {
          if (re.test(l) === invert) return;
          hits.push(flags.includes("n") ? `${i + 1}:${l}` : l);
        });

      if (flags.includes("c")) return { output: String(hits.length), state: next };
      return { output: hits.join("\n"), state: next };
    }
    case "rm": {
      const rec = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
      const names = args.filter((a) => !a.startsWith("-"));
      for (const name of names) {
        if (name === "/" || name === "~" || name === "/home") {
          return { output: "rm: refusing to remove that path in Simulation Mode", state: next };
        }
        const path = resolve(next, name)!;
        const { parent, name: base } = parentAndName(path);
        const parentNode = walk(next.fs, parent);
        if (!parentNode || parentNode.kind !== "dir" || !parentNode.children[base]) {
          return { output: `rm: cannot remove '${name}': No such file or directory`, state: next };
        }
        const target = parentNode.children[base];
        if (target.kind === "dir" && !rec) return { output: `rm: cannot remove '${name}': Is a directory`, state: next };
        delete parentNode.children[base];
      }
      return { output: "", state: next };
    }
    case "cp":
    case "mv": {
      const names = args.filter((a) => !a.startsWith("-"));
      if (names.length < 2) return { output: `${cmd}: missing operand`, state: next };
      const dest = resolve(next, names[names.length - 1])!;
      const src = resolve(next, names[0])!;
      const srcNode = walk(next.fs, src);
      if (!srcNode) return { output: `${cmd}: no such file`, state: next };
      const destNode = walk(next.fs, dest);
      const { parent: sp, name: sn } = parentAndName(src);
      const srcParent = walk(next.fs, sp);
      if (destNode && destNode.kind === "dir") {
        destNode.children[srcNode.name] = structuredClone(srcNode);
      } else {
        const { parent, name } = parentAndName(dest);
        const p = walk(next.fs, parent);
        if (!p || p.kind !== "dir") return { output: `${cmd}: dest error`, state: next };
        const copy = structuredClone(srcNode);
        copy.name = name;
        p.children[name] = copy;
      }
      if (cmd === "mv" && srcParent && srcParent.kind === "dir") delete srcParent.children[sn];
      return { output: "", state: next };
    }
    case "printf":
      return { output: args.join(" ").replace(/\\n/g, "\n"), state: next };
    case "export": {
      if (!args.length) {
        return {
          output: Object.entries(next.env)
            .map(([k, v]) => `declare -x ${k}="${v}"`)
            .join("\n"),
          state: next,
        };
      }
      for (const a of args) {
        const eq = a.indexOf("=");
        if (eq === -1) continue;
        next.env[a.slice(0, eq)] = a.slice(eq + 1);
      }
      return { output: "", state: next };
    }
    case "type":
    case "which": {
      const name = args.find((a) => !a.startsWith("-"));
      if (!name) return { output: `${cmd}: missing operand`, state: next };
      if (SIMULATED.includes(name)) {
        return { output: cmd === "type" ? `${name} is a simulated shell command` : `/usr/bin/${name}`, state: next };
      }
      return { output: `${cmd}: ${name}: not found in Simulation Mode`, state: next };
    }
    case "stat": {
      const name = args.find((a) => !a.startsWith("-")) || ".";
      const path = resolve(next, name);
      const node = path ? walk(next.fs, path) : null;
      if (!node) return { output: `stat: cannot statx '${name}'`, state: next };
      return {
        output: `  File: ${name}\n  Size: ${node.kind === "file" ? node.content.length : 4096}\n  Type: ${node.kind}\nAccess: ${node.mode}`,
        state: next,
      };
    }
    case "file": {
      const name = args[0];
      if (!name) return { output: "file: missing operand", state: next };
      const node = walk(next.fs, resolve(next, name)!);
      if (!node) return { output: `${name}: cannot open`, state: next };
      return { output: node.kind === "dir" ? `${name}: directory` : `${name}: ASCII text`, state: next };
    }
    case "chmod": {
      const mode = args.find((a) => /^[0-7]{3,4}$/.test(a) || /^[ugoa]*[-+=][rwx]+$/.test(a));
      const name = args.filter((a) => a !== mode).pop();
      if (!name) return { output: "chmod: missing operand", state: next };
      const path = resolve(next, name);
      const node = path ? walk(next.fs, path) : null;
      if (!node) return { output: `chmod: cannot access '${name}'`, state: next };
      if (mode && /^[0-7]{3}$/.test(mode)) {
        const map: Record<string, string> = {
          "7": "rwx",
          "6": "rw-",
          "5": "r-x",
          "4": "r--",
          "0": "---",
        };
        const u = map[mode[0]] ?? "rwx";
        const g = map[mode[1]] ?? "r-x";
        const o = map[mode[2]] ?? "r-x";
        node.mode = `${node.kind === "dir" ? "d" : "-"}${u}${g}${o}`;
      }
      return { output: "", state: next };
    }
    case "ln": {
      const sym = args.includes("-s");
      const names = args.filter((a) => !a.startsWith("-"));
      if (names.length < 2) return { output: "ln: missing operand", state: next };
      const target = names[0];
      const dest = resolve(next, names[1]);
      if (!dest) return { output: "ln: dest error", state: next };
      const { parent, name } = parentAndName(dest);
      const p = walk(next.fs, parent);
      if (!p || p.kind !== "dir") return { output: "ln: dest error", state: next };
      p.children[name] = file(name, sym ? `symlink -> ${target}` : "", "-rw-r--r--");
      return { output: "", state: next };
    }
    case "man": {
      const name = args.find((a) => !/^\d+$/.test(a) && !a.startsWith("-"));
      if (!name) return { output: "What manual page do you want?", state: next };
      if (SIMULATED.includes(name)) {
        return { output: `${name.toUpperCase()}(1)  Simulation Mode\n\nTYPE help FOR THE LAB COMMAND LIST.\nOn a real host run: man ${name}`, state: next };
      }
      return { output: `No simulated man page for ${name}. Open the Commands explorer in this site.`, state: next };
    }
    default:
      return {
        output: `bash: ${cmd}: command not simulated. Type help. Simulation Mode never executes host commands.`,
        state: next,
      };
  }
}

/* ==========================================================================
   Shell layer: pipes, redirection, globbing, completion.
   ========================================================================== */

/**
 * Reads a filter's input: the named files if any were given, otherwise the
 * piped stdin. This is what makes `grep x file` and `cat file | grep x` agree.
 */
function readInput(state: TermState, files: string[], stdin: string): { text: string; error?: string } {
  if (!files.length) return { text: stdin };
  let text = "";
  for (const name of files) {
    const node = walk(state.fs, resolve(state, name) ?? []);
    if (!node) return { text: "", error: `${name}: No such file or directory` };
    if (node.kind !== "file") return { text: "", error: `${name}: Is a directory` };
    text += node.content;
  }
  return { text };
}

const EXTRA: Record<string, Runner> = makeExtras({ walk, resolve, readInput });

/** Expands `*` and `?` against the filesystem, leaving non-matching words alone. */
function expandGlobs(state: TermState, args: string[]): string[] {
  return args.flatMap((word) => {
    if (!hasGlob(word)) return [word];
    const slash = word.lastIndexOf("/");
    const dirPart = slash === -1 ? "." : word.slice(0, slash) || "/";
    const basePart = slash === -1 ? word : word.slice(slash + 1);
    const node = walk(state.fs, resolve(state, dirPart) ?? []);
    if (!node || node.kind !== "dir") return [word];
    const re = globToRegExp(basePart);
    const hits = Object.keys(node.children)
      .filter((n) => re.test(n) && (basePart.startsWith(".") || !n.startsWith(".")))
      .sort()
      .map((n) => (slash === -1 ? n : `${word.slice(0, slash)}/${n}`));
    return hits.length ? hits : [word];
  });
}

/**
 * The sandbox entry point: parses one command line, runs each pipeline stage
 * in turn, and applies redirection. Returns the text to print plus the new
 * filesystem and shell state.
 */
export function runCommand(state: TermState, line: string): { output: string; state: TermState } {
  const trimmed = line.trim();
  if (!trimmed) return { output: "", state };

  const recorded: TermState = { ...state, history: [...state.history, trimmed] };

  const unsupported = unsupportedSyntax(trimmed);
  if (unsupported) return { output: unsupported, state: recorded };

  const parsed = parseLine(trimmed);
  if (parsed.error) return { output: `bash: ${parsed.error}`, state: recorded };

  let current = recorded;
  let stdin = "";
  let output = "";

  for (const stage of parsed.stages) {
    const argv = tokenize(stage.command);
    const expanded = [argv[0], ...expandGlobs(current, argv.slice(1))].filter(Boolean);
    const result = runBuiltin(current, expanded.join(" "), stdin);

    // clear and reset are whole-terminal actions; they end the line.
    if (result.output === "__CLEAR__") return result;

    current = result.state;
    stdin = result.output;
    output = result.output;
  }

  if (parsed.redirect) {
    const path = resolve(current, parsed.redirect.target) ?? [];
    const fs = writeFileAt(current.fs, path, output ? `${output}\n` : "", parsed.redirect.append, walk);
    return { output: "", state: { ...current, fs } };
  }

  return { output, state: current };
}

/**
 * Tab completion: command names for the first word, filesystem entries after.
 * Returns the candidates so the component can decide whether to complete or
 * list them.
 */
export function completionsFor(state: TermState, line: string): string[] {
  const parts = line.split(/\s+/);
  const word = parts[parts.length - 1] ?? "";

  if (parts.length <= 1) {
    return [...new Set([...SIMULATED, ...Object.keys(EXTRA)])].filter((n) => n.startsWith(word)).sort();
  }

  const slash = word.lastIndexOf("/");
  const dirPart = slash === -1 ? "." : word.slice(0, slash) || "/";
  const basePart = slash === -1 ? word : word.slice(slash + 1);
  const node = walk(state.fs, resolve(state, dirPart) ?? []);
  if (!node || node.kind !== "dir") return [];

  return Object.keys(node.children)
    .filter((n) => n.startsWith(basePart) && (basePart.startsWith(".") || !n.startsWith(".")))
    .sort()
    .map((n) => {
      const suffix = node.children[n].kind === "dir" ? "/" : "";
      return slash === -1 ? n + suffix : `${word.slice(0, slash)}/${n}${suffix}`;
    });
}
