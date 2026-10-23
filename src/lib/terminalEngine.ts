import {
  asFileText,
  breToJs,
  countFlag,
  fail,
  lines,
  makeExtras,
  own,
  stripTrailingNewline,
  writeFileAt,
  type Result,
  type Runner,
} from "./terminalExtras";
import { globToRegExp, parseLine, wordText, type Word } from "./terminalShell";

export type Node =
  | { kind: "dir"; name: string; children: Record<string, Node>; mode: string }
  | { kind: "file"; name: string; content: string; mode: string };

export interface TermState {
  cwd: string[];
  home: string[];
  env: Record<string, string>;
  /** Shell variables that have been assigned but not exported. */
  vars: Record<string, string>;
  /** Exit status of the last pipeline, for `$?`. */
  status: number;
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
    dir("dev", [file("null", "", "crw-rw-rw-")]),
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
    vars: {},
    status: 0,
    history: [],
    fs: initialFs(),
  };
}

/** What `$name` expands to. Unset variables expand to nothing, as in bash. */
function lookup(state: TermState, name: string): string {
  if (name === "?") return String(state.status);
  if (name === "$") return "2451"; // the shell's PID in the ps sample output
  if (name === "0") return "bash";
  if (name === "#") return "0";
  return state.env[name] ?? state.vars[name] ?? "";
}

function walk(root: Node, path: string[]): Node | null {
  let n = root;
  for (const p of path) {
    if (n.kind !== "dir") return null;
    const next = own(n.children, p);
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

/** "-rwsr-xr-x" to its permission bits, special bits included. */
function modeBits(mode: string): number {
  let bits = 0;
  for (let i = 0; i < 9; i += 1) {
    // s and t stand in for x; their capitals mean the special bit without x.
    if (!"-ST".includes(mode[i + 1])) bits |= 1 << (8 - i);
  }
  if ("sS".includes(mode[3])) bits |= 0o4000;
  if ("sS".includes(mode[6])) bits |= 0o2000;
  if ("tT".includes(mode[9])) bits |= 0o1000;
  return bits;
}

/** Permission bits to the nine characters after the type in `ls -l`. */
function modeString(bits: number): string {
  const chars = [..."rwxrwxrwx"].map((c, i) => (bits & (1 << (8 - i)) ? c : "-"));
  const special = (i: number, bit: number, letter: string) => {
    if (bits & bit) chars[i] = chars[i] === "x" ? letter : letter.toUpperCase();
  };
  special(2, 0o4000, "s");
  special(5, 0o2000, "s");
  special(8, 0o1000, "t");
  return chars.join("");
}

/**
 * Applies a chmod mode — octal like 750 or 4755, or symbolic like u+x,go-w —
 * to `bits`. Returns null when the mode is not valid.
 */
function applyMode(bits: number, mode: string, isDir: boolean): number | null {
  if (/^[0-7]{1,5}$/.test(mode)) {
    const value = parseInt(mode, 8) & 0o7777;
    // GNU chmod keeps a directory's setuid and setgid bits under a numeric
    // mode unless a fifth digit says otherwise (00755).
    return isDir && mode.length < 5 ? value | (bits & 0o6000) : value;
  }

  const CLASS: Record<string, number> = { u: 0o4700, g: 0o2070, o: 0o1007, a: 0o7777 };
  let out = bits;
  for (const clause of mode.split(",")) {
    const m = /^([ugoa]*)([-+=])([rwxXst]*)$/.exec(clause);
    if (!m) return null;
    const [, who, op, perms] = m;
    // With no class named, the umask (022 here) limits what is granted.
    const scope = who ? [...who].reduce((acc, c) => acc | CLASS[c], 0) : 0o7777 & ~0o022;
    let want = 0;
    for (const p of perms) {
      if (p === "r") want |= 0o444;
      if (p === "w") want |= 0o222;
      if (p === "x" || (p === "X" && (isDir || out & 0o111))) want |= 0o111;
      if (p === "s") want |= 0o6000;
      if (p === "t") want |= 0o1000;
    }
    want &= scope;
    if (op === "+") out |= want;
    if (op === "-") out &= ~want;
    if (op === "=") out = (out & ~(who ? scope : 0o777)) | want;
  }
  return out;
}

function parentAndName(path: string[]) {
  if (!path.length) return { parent: [] as string[], name: "" };
  return { parent: path.slice(0, -1), name: path[path.length - 1] };
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
  "unset",
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

/** Commands bash runs itself rather than from PATH. */
const BUILTINS = new Set(["cd", "echo", "pwd", "printf", "export", "unset", "history", "type", "help"]);
/** Builtins with no program of the same name on disk, so `which` finds nothing. */
const SHELL_ONLY = new Set(["cd", "export", "unset", "history", "type", "help"]);

/** Whether the sandbox runs `name`, counting the filters in terminalExtras. */
function isSimulated(name: string) {
  return SIMULATED.includes(name) || Object.hasOwn(EXTRA, name);
}

/**
 * Runs one simple command (no pipes, no redirection).
 *
 * `argv` arrives already split and unquoted by the shell layer. `stdin` is the
 * previous stage's output when this command is part of a pipeline. Filters
 * fall back to it when given no file operand, which is what makes
 * `cat file | grep x` behave the way it does on a real shell.
 *
 * runCommand() below is the entry point; it handles the shell syntax and then
 * calls in here per stage.
 */
function runBuiltin(
  state: TermState,
  argv: string[],
  stdin = "",
): Result {
  if (!argv.length) return { output: "", state };
  const next: TermState = {
    ...state,
    env: { ...state.env },
    cwd: [...state.cwd],
    history: state.history,
  };
  const cmd = argv[0];
  const args = argv.slice(1);

  // An own-property check: a plain lookup also finds Object.prototype, so
  // typing `toString` or `constructor` ran it as a command and wrecked the
  // terminal state.
  if (Object.hasOwn(EXTRA, cmd)) return EXTRA[cmd](next, args, stdin);

  switch (cmd) {
    case "help":
      return {
        output: [
          "Simulation Mode — an in-browser lab. Nothing here runs on your machine.",
          "",
          "  Files     ls cd pwd mkdir touch cat head tail stat file cp mv rm ln chmod du tree find",
          "  Text      grep sed cut tr sort uniq wc nl tac tee seq basename dirname",
          "  System    whoami id uname hostname env export unset date history ps df free uptime type which man",
          "  Shell     help clear reset",
          "",
          "  Pipes     cat /var/log/syslog | grep ERROR | wc -l",
          "  Lists     cd /tmp; ls",
          "  Redirect  echo hi > out.txt   >> appends   < reads   2> errors   2>&1 both",
          "  Vars      echo $HOME    NAME=value    export NAME    echo $?",
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
      return { output: args.join(" "), state: next };
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

      const parts = [...(loose.length ? [long ? loose.join("\n") : loose.join("  ")] : []), ...blocks];
      return {
        output: parts.join("\n\n"),
        error: errors.length ? errors.join("\n") : undefined,
        status: errors.length ? 2 : 0,
        state: next,
      };
    }
    case "cd": {
      const dest = args[0] ?? "~";
      const path = resolve(next, dest);
      if (!path) return fail(next, "cd: path error");
      const node = walk(next.fs, path);
      if (!node || node.kind !== "dir") return fail(next, `cd: ${dest}: No such directory`);
      next.cwd = path;
      next.env.PWD = "/" + path.join("/");
      return { output: "", state: next };
    }
    case "mkdir": {
      const pflag = args.includes("-p");
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return fail(next, "mkdir: missing operand");
      for (const name of names) {
        const path = resolve(next, name);
        if (!path) continue;
        const { parent, name: base } = parentAndName(path);
        let parentNode = walk(next.fs, parent);
        if ((!parentNode || parentNode.kind !== "dir") && pflag) {
          let cur = next.fs;
          for (const seg of path) {
            if (cur.kind !== "dir") return fail(next, "mkdir: not a directory");
            if (!own(cur.children, seg)) cur.children[seg] = dir(seg);
            cur = cur.children[seg];
          }
          continue;
        }
        if (!parentNode || parentNode.kind !== "dir") return fail(next, `mkdir: cannot create directory '${name}'`);
        if (own(parentNode.children, base) && !pflag) return fail(next, `mkdir: cannot create directory '${name}': File exists`);
        if (!own(parentNode.children, base)) parentNode.children[base] = dir(base);
      }
      return { output: "", state: next };
    }
    case "touch": {
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return fail(next, "touch: missing file operand");
      for (const name of names) {
        const path = resolve(next, name)!;
        const { parent, name: base } = parentAndName(path);
        const parentNode = walk(next.fs, parent);
        if (!parentNode || parentNode.kind !== "dir") return fail(next, `touch: cannot touch '${name}'`);
        if (!own(parentNode.children, base)) parentNode.children[base] = file(base, "");
      }
      return { output: "", state: next };
    }
    case "cat": {
      const read = readInput(next, args, stdin);
      if (read.error) return fail(next, `cat: ${read.error}`);
      return { output: read.text, state: next };
    }
    case "head":
    case "tail": {
      const count = countFlag(args, 10);
      const files = args.filter((a) => !a.startsWith("-") && !/^\d+$/.test(a));
      const read = readInput(next, files, stdin);
      if (read.error) return fail(next, `${cmd}: ${read.error}`);
      const lines = stripTrailingNewline(read.text).split("\n");
      const slice = cmd === "head" ? lines.slice(0, count) : lines.slice(-count);
      return { output: slice.join("\n"), state: next };
    }
    case "wc": {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const files = args.filter((a) => !a.startsWith("-"));
      const read = readInput(next, files, stdin);
      if (read.error) return fail(next, `wc: ${read.error}`);
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
      const opts = new Set<string>();
      const patterns: string[] = [];
      const operands: string[] = [];
      for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === "-e") patterns.push(args[(i += 1)] ?? "");
        else if (/^-[a-zA-Z]+$/.test(a)) for (const c of a.slice(1)) opts.add(c);
        else if (a.startsWith("--")) return fail(next, `grep: option '${a}' is not simulated here`, 2);
        else operands.push(a);
      }
      const unsupported = [...opts].find((c) => !"ivncEFwxolLhHqsrR".includes(c));
      if (unsupported) return fail(next, `grep: -${unsupported} is not simulated here`, 2);
      if (!patterns.length) {
        if (!operands.length) return fail(next, "Usage: grep [OPTION]... PATTERNS [FILE]...", 2);
        patterns.push(operands.shift()!);
      }

      // Basic regular expressions unless -E, fixed strings with -F.
      const source = patterns
        .map((p) => (opts.has("F") ? p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : opts.has("E") ? p : breToJs(p)))
        .map((p) => (opts.has("x") ? `^(?:${p})$` : opts.has("w") ? `(?<!\\w)(?:${p})(?!\\w)` : p))
        .join("|");
      let re: RegExp;
      try {
        re = new RegExp(source, `g${opts.has("i") ? "i" : ""}`);
      } catch {
        return fail(next, "grep: Invalid regular expression", 2);
      }

      // Each operand becomes one or more named inputs; -r walks directories.
      const recursive = opts.has("r") || opts.has("R");
      const errors: string[] = [];
      const inputs: { name: string; text: string }[] = [];
      const collect = (name: string, node: Node) => {
        if (node.kind === "file") inputs.push({ name, text: node.content });
        else if (!recursive) errors.push(`grep: ${name}: Is a directory`);
        else for (const key of Object.keys(node.children).sort()) collect(`${name.replace(/\/$/, "")}/${key}`, node.children[key]);
      };
      if (!operands.length && recursive) operands.push(".");
      for (const name of operands) {
        const node = walk(next.fs, resolve(next, name) ?? []);
        if (node) collect(name, node);
        else errors.push(`grep: ${name}: No such file or directory`);
      }
      if (!operands.length) inputs.push({ name: "(standard input)", text: stdin });

      const label = opts.has("H") || (!opts.has("h") && (operands.length > 1 || recursive));
      const out: string[] = [];
      let matched = false;
      for (const { name, text } of inputs) {
        const prefix = label ? `${name}:` : "";
        let count = 0;
        lines(text).forEach((line, i) => {
          re.lastIndex = 0;
          if (re.test(line) === opts.has("v")) return;
          count += 1;
          if (opts.has("c") || opts.has("l") || opts.has("L") || opts.has("q")) return;
          const where = `${prefix}${opts.has("n") ? `${i + 1}:` : ""}`;
          if (opts.has("o") && !opts.has("v")) {
            // matchAll starts from lastIndex, which test() just moved.
            re.lastIndex = 0;
            for (const m of line.matchAll(re)) if (m[0]) out.push(`${where}${m[0]}`);
          } else {
            out.push(`${where}${line}`);
          }
        });
        if (count) matched = true;
        if (opts.has("c")) out.push(`${prefix}${count}`);
        if (opts.has("l") && count) out.push(name);
        if (opts.has("L") && !count) out.push(name);
      }

      // 0 on a match, 1 on none, 2 on trouble — how scripts test grep.
      const status = errors.length && !(opts.has("q") && matched) ? 2 : matched ? 0 : 1;
      return {
        output: opts.has("q") ? "" : out.join("\n"),
        error: errors.length && !opts.has("s") ? errors.join("\n") : undefined,
        status,
        state: next,
      };
    }
    case "rm": {
      const flags = args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join("");
      const rec = /[rR]/.test(flags) || args.includes("--recursive");
      const force = flags.includes("f") || args.includes("--force");
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return force ? { output: "", state: next } : fail(next, "rm: missing operand");

      // Checked on the resolved path, not the spelling: ~, /home/student/,
      // and ../.. from inside home all name the same protected directory.
      const errors: string[] = [];
      for (const name of names) {
        const path = resolve(next, name) ?? [];
        const last = name.split("/").filter(Boolean).pop();
        if (last === "." || last === "..") {
          errors.push(`rm: refusing to remove '.' or '..' directory: skipping '${name}'`);
          continue;
        }
        if (!path.length) {
          errors.push(
            rec
              ? "rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe"
              : "rm: cannot remove '/': Is a directory",
          );
          continue;
        }
        if (path.length <= next.home.length && path.every((p, i) => p === next.home[i])) {
          errors.push(`rm: refusing to remove '${name}' in Simulation Mode: it holds the lab's home directory`);
          continue;
        }
        const { parent, name: base } = parentAndName(path);
        const parentNode = walk(next.fs, parent);
        const target = parentNode?.kind === "dir" ? own(parentNode.children, base) : undefined;
        if (!parentNode || parentNode.kind !== "dir" || !target) {
          if (!force) errors.push(`rm: cannot remove '${name}': No such file or directory`);
          continue;
        }
        if (target.kind === "dir" && !rec) {
          errors.push(`rm: cannot remove '${name}': Is a directory`);
          continue;
        }
        delete parentNode.children[base];
      }
      return errors.length ? fail(next, errors.join("\n")) : { output: "", state: next };
    }
    case "cp":
    case "mv": {
      const flags = args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join("");
      const recursive = cmd === "mv" || /[rRa]/.test(flags) || args.includes("--recursive");
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return fail(next, `${cmd}: missing file operand`);
      if (names.length < 2) return fail(next, `${cmd}: missing destination file operand after '${names[0]}'`);

      const destName = names[names.length - 1];
      const destPath = resolve(next, destName) ?? [];
      const intoDir = walk(next.fs, destPath)?.kind === "dir";
      const sources = names.slice(0, -1);
      if (sources.length > 1 && !intoDir) return fail(next, `${cmd}: target '${destName}' is not a directory`);

      const errors: string[] = [];
      for (const srcName of sources) {
        const srcPath = resolve(next, srcName) ?? [];
        const srcNode = walk(next.fs, srcPath);
        if (!srcNode) {
          errors.push(`${cmd}: cannot stat '${srcName}': No such file or directory`);
          continue;
        }
        if (srcNode.kind === "dir" && !recursive) {
          errors.push(`cp: -r not specified; omitting directory '${srcName}'`);
          continue;
        }
        const base = srcPath[srcPath.length - 1] ?? "";
        const target = intoDir ? [...destPath, base] : destPath;
        const shown = intoDir ? `${destName.replace(/\/+$/, "")}/${base}` : destName;
        const src = srcPath.join("/");

        if (cmd === "mv" && srcPath.length <= next.home.length && srcPath.every((p, i) => p === next.home[i])) {
          errors.push(`mv: refusing to move '${srcName}' in Simulation Mode: it holds the lab's home directory`);
          continue;
        }
        // Without these two checks mv deleted the file it had just "moved"
        // onto itself, and moving a directory into itself lost it entirely.
        if (target.join("/") === src) {
          errors.push(`${cmd}: '${srcName}' and '${shown}' are the same file`);
          continue;
        }
        if (srcNode.kind === "dir" && target.join("/").startsWith(`${src}/`)) {
          errors.push(`${cmd}: cannot ${cmd === "mv" ? "move" : "copy"} '${srcName}' to a subdirectory of itself, '${shown}'`);
          continue;
        }

        const { parent, name } = parentAndName(target);
        const parentNode = walk(next.fs, parent);
        if (!parentNode || parentNode.kind !== "dir") {
          errors.push(
            cmd === "mv"
              ? `mv: cannot move '${srcName}' to '${shown}': No such file or directory`
              : `cp: cannot create regular file '${shown}': No such file or directory`,
          );
          continue;
        }
        if (own(parentNode.children, name)?.kind === "dir" && srcNode.kind !== "dir") {
          errors.push(`${cmd}: cannot overwrite directory '${shown}' with non-directory`);
          continue;
        }

        const copy = structuredClone(srcNode);
        copy.name = name;
        parentNode.children[name] = copy;
        if (cmd === "mv") {
          const from = parentAndName(srcPath);
          const fromNode = walk(next.fs, from.parent);
          if (fromNode?.kind === "dir") delete fromNode.children[from.name];
        }
      }
      return errors.length ? fail(next, errors.join("\n")) : { output: "", state: next };
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
      next.vars = { ...next.vars };
      for (const a of args) {
        const eq = a.indexOf("=");
        const key = eq === -1 ? a : a.slice(0, eq);
        // `export NAME` promotes an existing shell variable to the environment.
        const value = eq === -1 ? next.vars[key] : a.slice(eq + 1);
        delete next.vars[key];
        if (value !== undefined) next.env[key] = value;
      }
      return { output: "", state: next };
    }
    case "unset": {
      next.vars = { ...next.vars };
      for (const a of args) {
        delete next.env[a];
        delete next.vars[a];
      }
      return { output: "", state: next };
    }
    case "type":
    case "which": {
      const names = args.filter((a) => !a.startsWith("-"));
      if (!names.length) return cmd === "type" ? { output: "", state: next } : fail(next, "", 1);
      const found: string[] = [];
      const missing: string[] = [];
      for (const name of names) {
        const builtin = BUILTINS.has(name);
        const external = isSimulated(name) && !SHELL_ONLY.has(name);
        if (cmd === "type") {
          if (builtin) found.push(`${name} is a shell builtin`);
          else if (external) found.push(`${name} is /usr/bin/${name}`);
          else missing.push(`bash: type: ${name}: not found`);
        } else if (external) {
          found.push(`/usr/bin/${name}`);
        } else {
          // which only searches PATH, so a builtin such as cd has no answer.
          missing.push("");
        }
      }
      const error = missing.filter(Boolean).join("\n");
      return { output: found.join("\n"), error: error || undefined, status: missing.length ? 1 : 0, state: next };
    }
    case "stat": {
      const name = args.find((a) => !a.startsWith("-")) || ".";
      const path = resolve(next, name);
      const node = path ? walk(next.fs, path) : null;
      if (!node) return fail(next, `stat: cannot statx '${name}'`);
      return {
        output: `  File: ${name}\n  Size: ${node.kind === "file" ? node.content.length : 4096}\n  Type: ${node.kind}\nAccess: ${node.mode}`,
        state: next,
      };
    }
    case "file": {
      const name = args[0];
      if (!name) return fail(next, "file: missing operand");
      const node = walk(next.fs, resolve(next, name)!);
      if (!node) return { output: `${name}: cannot open`, state: next };
      return { output: node.kind === "dir" ? `${name}: directory` : `${name}: ASCII text`, state: next };
    }
    case "chmod": {
      // -x is a mode, not an option, so only the real options are set aside.
      const operands = args.filter((a) => !["-R", "-v", "-c", "-f", "--recursive"].includes(a));
      const recursive = args.includes("-R") || args.includes("--recursive");
      const [mode, ...names] = operands;
      if (!mode) return fail(next, "chmod: missing operand");
      if (!names.length) return fail(next, `chmod: missing operand after '${mode}'`);
      if (applyMode(0, mode, false) === null) return fail(next, `chmod: invalid mode: '${mode}'`);

      const errors: string[] = [];
      const visit = (node: Node) => {
        node.mode = node.mode[0] + modeString(applyMode(modeBits(node.mode), mode, node.kind === "dir")!);
        if (recursive && node.kind === "dir") Object.values(node.children).forEach(visit);
      };
      for (const name of names) {
        const node = walk(next.fs, resolve(next, name) ?? []);
        if (node) visit(node);
        else errors.push(`chmod: cannot access '${name}': No such file or directory`);
      }
      return errors.length ? fail(next, errors.join("\n")) : { output: "", state: next };
    }
    case "ln": {
      const sym = args.includes("-s");
      const names = args.filter((a) => !a.startsWith("-"));
      if (names.length < 2) return fail(next, "ln: missing operand");
      const target = names[0];
      const dest = resolve(next, names[1]);
      if (!dest) return fail(next, "ln: dest error");
      const { parent, name } = parentAndName(dest);
      const p = walk(next.fs, parent);
      if (!p || p.kind !== "dir") return fail(next, "ln: dest error");
      p.children[name] = file(name, sym ? `symlink -> ${target}` : "", "-rw-r--r--");
      return { output: "", state: next };
    }
    case "man": {
      // Skip a section such as 2 or 1p: `man 1p printf` is about printf.
      const name = args.find((a) => !/^\d\w*$/.test(a) && !a.startsWith("-"));
      if (!name) return fail(next, "What manual page do you want?");
      if (isSimulated(name)) {
        return { output: `${name.toUpperCase()}(1)  Simulation Mode\n\nTYPE help FOR THE LAB COMMAND LIST.\nOn a real host run: man ${name}`, state: next };
      }
      return fail(next, `No simulated man page for ${name}. Open the Commands explorer in this site.`, 16);
    }
    default:
      // 127 is bash's "command not found".
      return fail(next, `bash: ${cmd}: command not simulated. Type help. Simulation Mode never executes host commands.`, 127);
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

/**
 * Turns parsed words into argv: variables are filled in, then unquoted `*`
 * and `?` expand against the filesystem, leaving non-matching words alone. A
 * quoted pattern reaches the command as typed, which is what
 * `find . -name '*.txt'` depends on. An unquoted variable that expands to
 * nothing disappears, as it does in bash.
 */
function expandWords(state: TermState, args: Word[]): string[] {
  return args.flatMap((w) => {
    const word = wordText(w, (name) => lookup(state, name));
    if (!word && !w.quoted) return [];
    if (!w.glob) return [word];
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

  const parsed = parseLine(trimmed);
  if (parsed.error) return { output: parsed.error, state: { ...recorded, status: 2 } };

  let current = recorded;
  const printed: string[] = [];

  for (const pipeline of parsed.pipelines) {
    let output = "";
    let status = 0;

    for (const stage of pipeline) {
      const expand = (w: Word) => wordText(w, (n) => lookup(current, n));

      // NAME=value words before the command. On their own they set shell
      // variables; in front of a command they would only reach that
      // command's environment, which nothing in the sandbox reads.
      const assignments: [string, string][] = [];
      let start = 0;
      for (; start < stage.words.length; start += 1) {
        const head = stage.words[start].parts[0];
        const m = typeof head === "string" ? /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(head) : null;
        if (!m) break;
        const value = expand(stage.words[start]).slice(m[0].length);
        assignments.push([m[1], value]);
      }
      if (start === stage.words.length) {
        const env = { ...current.env };
        const vars = { ...current.vars };
        for (const [key, value] of assignments) {
          if (key in env) env[key] = value;
          else vars[key] = value;
        }
        current = { ...current, env, vars };
        output = "";
        status = 0;
        continue;
      }

      // Redirections are set up before the command runs, left to right, so
      // `> out 2>&1` and `2>&1 > out` differ exactly as they do in bash. A
      // sink is the pipe (or terminal) for stdout, the terminal for stderr,
      // or a file path.
      type Sink = "stdout" | "stderr" | string[];
      let out: Sink = "stdout";
      let err: Sink = "stderr";
      let stdin = output;
      let broken = "";
      for (const r of stage.redirects) {
        if ("dup" in r) {
          if (r.fd === 2) err = out;
          else out = err;
          continue;
        }
        const name = expand(r.target);
        const path = resolve(current, name) ?? [];
        if (r.fd === 0) {
          const node = walk(current.fs, path);
          if (!node || node.kind !== "file") {
            broken = `bash: ${name}: ${node ? "Is a directory" : "No such file or directory"}`;
            break;
          }
          stdin = node.content;
          continue;
        }
        current = { ...current, fs: writeFileAt(current.fs, path, "", r.append, walk) };
        if (r.fd !== 2) out = path;
        if (r.fd !== 1) err = path;
      }
      if (broken) {
        printed.push(broken);
        output = "";
        status = 1;
        continue;
      }

      const result = runBuiltin(current, expandWords(current, stage.words.slice(start)), stdin);

      // clear and reset are whole-terminal actions; they end the line.
      if (result.output === "__CLEAR__") return result;

      current = result.state;
      status = result.status ?? 0;

      // Errors print as they happen and never travel down a pipe or into a
      // file unless 2> or 2>&1 sends them there.
      let piped = "";
      const send = (sink: Sink, text: string) => {
        if (!text) return;
        if (sink === "stdout") piped = piped ? `${piped}\n${text}` : text;
        else if (sink === "stderr") printed.push(stripTrailingNewline(text));
        else current = { ...current, fs: writeFileAt(current.fs, sink, asFileText(text), true, walk) };
      };
      send(err, result.error ?? "");
      send(out, result.output);
      output = piped;
    }

    // A file's own trailing newline is the end of its last line, not a blank
    // line before the next command's output.
    if (output) printed.push(stripTrailingNewline(output));
    current = { ...current, status };
  }

  return { output: printed.join("\n"), state: current };
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
