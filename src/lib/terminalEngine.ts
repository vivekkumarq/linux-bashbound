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

export function runCommand(state: TermState, line: string): { output: string; state: TermState } {
  const trimmed = line.trim();
  if (!trimmed) return { output: "", state };
  const next: TermState = {
    ...state,
    env: { ...state.env },
    cwd: [...state.cwd],
    history: [...state.history, trimmed],
  };
  const argv = tokenize(trimmed);
  const cmd = argv[0];
  const args = argv.slice(1);

  switch (cmd) {
    case "help":
      return {
        output:
          "Simulation Mode (in-browser lab, not a real OS).\n  Files: pwd ls cd mkdir touch cat head tail wc grep rm cp mv chmod ln stat file\n  Shell: echo printf whoami id uname hostname env export date history type which clear help reset\nDestructive paths like / are refused. Type a command, or open this palette with Ctrl+K then Live bash.",
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
      const targetArg = args.find((a) => !a.startsWith("-")) || ".";
      const path = resolve(next, targetArg);
      if (!path) return { output: "ls: path error", state: next };
      const node = walk(next.fs, path);
      if (!node) return { output: `ls: cannot access '${targetArg}': No such file or directory`, state: next };
      const long = args.some((a) => a.includes("l"));
      const all = args.some((a) => a.includes("a"));
      if (node.kind === "file") return { output: node.name, state: next };
      const names = Object.keys(node.children).sort();
      const shown = all ? [".", "..", ...names] : names;
      if (!long) return { output: shown.join("  "), state: next };
      const lines = shown.map((name) => {
        if (name === "." || name === "..") return `drwxr-xr-x  student student  4096  ${name}`;
        const ch = node.children[name];
        return `${ch.mode}  student student  ${ch.kind === "file" ? ch.content.length : 4096}  ${name}`;
      });
      return { output: lines.join("\n"), state: next };
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
      if (!args.length) return { output: "cat: missing file (simulation does not read tty loops)", state: next };
      const chunks: string[] = [];
      for (const name of args) {
        const path = resolve(next, name)!;
        const node = walk(next.fs, path);
        if (!node || node.kind !== "file") return { output: `cat: ${name}: No such file`, state: next };
        chunks.push(node.content.replace(/\n$/, "") === node.content ? node.content : node.content);
      }
      return { output: chunks.join(""), state: next };
    }
    case "head":
    case "tail": {
      const nFlag = args.find((flag) => flag.startsWith("-n")) || args.find((_, i) => args[i - 1] === "-n");
      let count = 10;
      if (nFlag?.startsWith("-n") && nFlag.length > 2) count = Number(nFlag.slice(2)) || 10;
      const fileArg = args.filter((a) => !a.startsWith("-") && a !== nFlag).pop();
      if (!fileArg) return { output: `${cmd}: missing file`, state: next };
      const node = walk(next.fs, resolve(next, fileArg)!);
      if (!node || node.kind !== "file") return { output: `${cmd}: no such file`, state: next };
      const lines = node.content.split("\n");
      const slice = cmd === "head" ? lines.slice(0, count) : lines.slice(-count);
      return { output: slice.join("\n"), state: next };
    }
    case "wc": {
      const fileArg = args.find((a) => !a.startsWith("-"));
      if (!fileArg) return { output: "wc: missing file", state: next };
      const node = walk(next.fs, resolve(next, fileArg)!);
      if (!node || node.kind !== "file") return { output: "wc: no such file", state: next };
      const lines = node.content.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
      const words = node.content.trim() ? node.content.trim().split(/\s+/).length : 0;
      return { output: `${lines.length} ${words} ${node.content.length} ${fileArg}`, state: next };
    }
    case "grep": {
      const pat = args.find((a) => !a.startsWith("-"));
      const fileArg = args.filter((a) => !a.startsWith("-"))[1];
      if (!pat || !fileArg) return { output: "grep: usage: grep PATTERN FILE", state: next };
      const node = walk(next.fs, resolve(next, fileArg)!);
      if (!node || node.kind !== "file") return { output: "grep: no such file", state: next };
      const invert = args.includes("-v");
      const lines = node.content.split("\n").filter((l) => (l.includes(pat) ? !invert : invert));
      return { output: lines.join("\n"), state: next };
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
