import {
  asFileText,
  countFlag,
  fail,
  makeExtras,
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
            if (!cur.children[seg]) cur.children[seg] = dir(seg);
            cur = cur.children[seg];
          }
          continue;
        }
        if (!parentNode || parentNode.kind !== "dir") return fail(next, `mkdir: cannot create directory '${name}'`);
        if (parentNode.children[base] && !pflag) return fail(next, `mkdir: cannot create directory '${name}': File exists`);
        if (!parentNode.children[base]) parentNode.children[base] = dir(base);
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
        if (!parentNode.children[base]) parentNode.children[base] = file(base, "");
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
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const positional = args.filter((a) => !a.startsWith("-"));
      const pat = positional[0];
      if (!pat) return fail(next, "grep: usage: grep [-ivnc] PATTERN [FILE...]", 2);
      const read = readInput(next, positional.slice(1), stdin);
      if (read.error) return fail(next, `grep: ${read.error}`, 2);

      let re: RegExp;
      try {
        re = new RegExp(pat, flags.includes("i") ? "i" : "");
      } catch {
        return fail(next, `grep: ${pat}: invalid regular expression`, 2);
      }

      const invert = flags.includes("v");
      const hits: string[] = [];
      stripTrailingNewline(read.text)
        .split("\n")
        .forEach((l, i) => {
          if (re.test(l) === invert) return;
          hits.push(flags.includes("n") ? `${i + 1}:${l}` : l);
        });

      // grep's status is 1 when nothing matched, which is how scripts test it.
      const status = hits.length ? 0 : 1;
      if (flags.includes("c")) return { output: String(hits.length), status, state: next };
      return { output: hits.join("\n"), status, state: next };
    }
    case "rm": {
      const rec = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
      const names = args.filter((a) => !a.startsWith("-"));
      for (const name of names) {
        if (name === "/" || name === "~" || name === "/home") {
          return fail(next, "rm: refusing to remove that path in Simulation Mode");
        }
        const path = resolve(next, name)!;
        const { parent, name: base } = parentAndName(path);
        const parentNode = walk(next.fs, parent);
        if (!parentNode || parentNode.kind !== "dir" || !parentNode.children[base]) {
          return fail(next, `rm: cannot remove '${name}': No such file or directory`);
        }
        const target = parentNode.children[base];
        if (target.kind === "dir" && !rec) return fail(next, `rm: cannot remove '${name}': Is a directory`);
        delete parentNode.children[base];
      }
      return { output: "", state: next };
    }
    case "cp":
    case "mv": {
      const names = args.filter((a) => !a.startsWith("-"));
      if (names.length < 2) return fail(next, `${cmd}: missing operand`);
      const dest = resolve(next, names[names.length - 1])!;
      const src = resolve(next, names[0])!;
      const srcNode = walk(next.fs, src);
      if (!srcNode) return fail(next, `${cmd}: no such file`);
      const destNode = walk(next.fs, dest);
      const { parent: sp, name: sn } = parentAndName(src);
      const srcParent = walk(next.fs, sp);
      if (destNode && destNode.kind === "dir") {
        destNode.children[srcNode.name] = structuredClone(srcNode);
      } else {
        const { parent, name } = parentAndName(dest);
        const p = walk(next.fs, parent);
        if (!p || p.kind !== "dir") return fail(next, `${cmd}: dest error`);
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
      const name = args.find((a) => !a.startsWith("-"));
      if (!name) return fail(next, `${cmd}: missing operand`);
      if (SIMULATED.includes(name)) {
        return { output: cmd === "type" ? `${name} is a simulated shell command` : `/usr/bin/${name}`, state: next };
      }
      return fail(next, `${cmd}: ${name}: not found in Simulation Mode`);
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
      const name = args.find((a) => !/^\d+$/.test(a) && !a.startsWith("-"));
      if (!name) return fail(next, "What manual page do you want?");
      if (SIMULATED.includes(name)) {
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
