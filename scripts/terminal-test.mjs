/**
 * Smoke test for the terminal sandbox.
 *
 * The shell layer (pipes, redirection, globbing, filters reading stdin) is the
 * only genuinely tricky logic in the app, so it gets a check. Run with
 * `npm test`.
 */
import { rolldown } from "rolldown";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bundle = await rolldown({ input: "src/lib/terminalEngine.ts", platform: "node", logLevel: "silent" });
const { output } = await bundle.generate({ format: "esm" });
const entry = join(mkdtempSync(join(tmpdir(), "bb-term-")), "engine.mjs");
writeFileSync(entry, output[0].code);

const { freshState, runCommand, completionsFor } = await import(`file://${entry}`);

let state = freshState();
let failures = 0;

/** Runs a line against the shared state and returns its output. */
function sh(line) {
  const result = runCommand(state, line);
  state = result.state;
  return result.output;
}

/** Exact contents of a file in the virtual filesystem, trailing newline included. */
function fileText(path) {
  let node = state.fs;
  for (const part of path.split("/").filter(Boolean)) node = node?.children?.[part];
  return node?.content;
}

function check(label, actual, expected) {
  const ok = typeof expected === "function" ? expected(actual) : actual === expected;
  if (ok) {
    console.log(`  ok  ${label}`);
    return;
  }
  failures += 1;
  console.error(`FAIL  ${label}`);
  console.error(`      got:      ${JSON.stringify(actual)}`);
  if (typeof expected !== "function") console.error(`      expected: ${JSON.stringify(expected)}`);
}

console.log("terminal sandbox");

// Basics still work after the shell layer was added.
check("pwd", sh("pwd"), "/home/student");
check("whoami", sh("whoami"), "student");
check("cd changes directory", (sh("cd Documents"), sh("pwd")), "/home/student/Documents");
sh("cd ..");

// Pipes: a filter with no file operand must read stdin.
check("echo | wc -l", sh("echo hello | wc -l"), "1");
check("cat | grep", sh("cat Documents/notes.txt | grep Linux"), (out) => out.includes("Linux BashBound"));
check("grep -c counts", sh("cat /var/log/syslog | grep -c INFO"), "2");
check("three-stage pipeline", sh("cat /var/log/syslog | grep INFO | wc -l"), "2");
check("grep -v inverts", sh("cat /var/log/syslog | grep -v INFO | wc -l"), "1");

// New filters.
check("sort", sh("printf 'b\\na\\nc' | sort"), (out) => out === "b\na\nc" || out === "a\nb\nc");
check("seq feeds sort -n", sh("seq 3 | sort -rn"), "3\n2\n1");
check("uniq -c", sh("seq 2 | uniq -c"), (out) => out.includes("1"));
check("tr", sh("echo abc | tr a-z A-Z"), "ABC");
check("sed substitution", sh("echo hello | sed s/hello/world/"), "world");
check("cut", sh("echo one:two:three | cut -d: -f2"), "two");
check("nl numbers lines", sh("seq 2 | nl"), (out) => /1\t1/.test(out));

// Redirection writes to the virtual filesystem and produces no terminal output.
check("redirect is silent", sh("echo written > /tmp/out.txt"), "");
check("redirect wrote the file", fileText("/tmp/out.txt"), "written\n");
sh("echo second >> /tmp/out.txt");
check("append", fileText("/tmp/out.txt"), "written\nsecond\n");
check("pipeline into redirect", (sh("seq 3 | sort -rn > /tmp/nums.txt"), fileText("/tmp/nums.txt")), "3\n2\n1\n");
check("cat > copy is byte-for-byte", (sh("cat /tmp/out.txt > /tmp/copy.txt"), fileText("/tmp/copy.txt")), "written\nsecond\n");
check("tee writes whole lines", (sh("echo teed | tee /tmp/tee.txt"), fileText("/tmp/tee.txt")), "teed\n");
check("empty output makes an empty file", (sh("grep nothing-matches /var/log/syslog > /tmp/empty.txt"), fileText("/tmp/empty.txt")), "");

// Globs expand against the filesystem.
sh("cd /tmp");
check("glob matches", sh("ls *.txt"), (out) => out.includes("out.txt") && out.includes("nums.txt"));
check("non-matching glob is left alone", sh("ls *.nope"), (out) => out.includes("No such file"));
sh("cd ~");

// find and tree walk the tree.
check("find -name", sh("find /home -name notes.txt"), (out) => out.includes("notes.txt"));
check("find -type d", sh("find /home -type d"), (out) => out.includes("/home/student"));
check("tree summarises", sh("tree /home"), (out) => /directories, \d+ files/.test(out));

// Unsupported syntax is reported, never silently mis-run.
check("control flow refused", sh("for i in 1 2; do echo $i; done"), (out) => out.includes("Control flow"));
check("substitution refused", sh("echo $(date)"), (out) => out.includes("substitution"));
check("&& refused", sh("true && false"), (out) => out.includes("Command lists"));

// Quoting: a quoted argument reaches the command as one word, and operators
// and globs inside quotes are plain text.
check("quoted pattern with a space", sh('grep "boot complete" /var/log/syslog'), "INFO boot complete");
check("single quotes keep spaces", sh("echo 'a   b'"), "a   b");
check("> inside quotes is text", sh('echo "a > b"'), "a > b");
check("| inside quotes is text", sh("echo 'x | y'"), "x | y");
check("quoted glob is not expanded", (sh("cd /tmp"), sh("echo '*.txt'")), "*.txt");
check("find gets the quoted pattern", sh("find /tmp -name '*.txt'"), (out) => out.includes("/tmp/out.txt") && out.includes("/tmp/nums.txt"));
sh("cd ~");
check("keyword as an argument is not control flow", sh("echo if for while"), "if for while");
check("redirect mid-pipeline", (sh("echo hi > /tmp/mid.txt | cat"), fileText("/tmp/mid.txt")), "hi\n");
check("unterminated quote", sh("echo 'oops"), (out) => out.includes("unexpected EOF"));

// ; runs commands one after another, in the same shell.
check("; sequences commands", sh("cd /etc; cat hostname; pwd"), "bashbound\n/etc");
check("trailing ; is fine", sh("pwd;"), "/etc");
check("; inside quotes is text", sh("echo 'a; b'"), "a; b");
check("leading ; is a syntax error", sh("; ls"), (out) => out.includes("syntax error"));
sh("cd ~");

// Variables and ~ expand; single quotes keep them literal.
check("$HOME expands", sh("echo $HOME"), "/home/student");
check("${VAR} and quotes", sh('echo "${USER}:$PATH"'), "student:/usr/local/bin:/usr/bin:/bin");
check("single quotes stay literal", sh("echo '$HOME'"), "$HOME");
check("escaped $ stays literal", sh("echo \\$HOME"), "$HOME");
check("~ expands at the start of a word", sh("echo ~ ~/x a~b"), "/home/student /home/student/x a~b");
check("export uses the expanded value", (sh('export PATH="$HOME/bin:$PATH"'), sh("echo $PATH")), "/home/student/bin:/usr/local/bin:/usr/bin:/bin");
check("assignment then expansion in one line", sh("GREETING=hi; echo $GREETING there"), "hi there");
check("a shell variable is not in env", sh("env"), (out) => !out.includes("GREETING"));
check("export promotes it", (sh("export GREETING"), sh("env")), (out) => out.includes("GREETING=hi"));
check("unset removes it", (sh("unset GREETING"), sh("echo [$GREETING]")), "[]");
check("unset variable vanishes unquoted", sh("echo a $NOPE b"), "a b");
check("redirect target expands", (sh("echo v > $HOME/v.txt"), fileText("/home/student/v.txt")), "v\n");
sh("reset");

// stderr is its own channel: it reaches the terminal, not pipes or files.
check("error is not piped", sh("cat /nope | wc -l"), "cat: /nope: No such file or directory\n0");
check("error is not redirected by >", (sh("ls /nope > /tmp/ls.txt"), fileText("/tmp/ls.txt")), "");
check("> still shows the error", sh("ls /nope > /tmp/ls.txt"), "ls: cannot access '/nope': No such file or directory");
check("2> sends it to a file", (sh("ls /nope 2> /tmp/err.txt"), fileText("/tmp/err.txt")), "ls: cannot access '/nope': No such file or directory\n");
check("2>/dev/null hides it", sh("ls /nope 2>/dev/null"), "");
check("2>&1 merges into the pipe", sh("ls /nope 2>&1 | wc -l"), "1");
check("> file 2>&1 captures both", (sh("ls /nope /etc > /tmp/both.txt 2>&1"), fileText("/tmp/both.txt")), (out) => out.startsWith("ls: cannot access") && out.includes("hostname"));
check("2>&1 > file keeps the error on screen", sh("ls /nope 2>&1 > /tmp/order.txt"), (out) => out.includes("cannot access"));
check("&> captures both", (sh("ls /nope &> /tmp/amp.txt"), fileText("/tmp/amp.txt")), (out) => out.includes("cannot access"));
check(">&2 turns output into an error", sh("echo oops >&2 | wc -l"), "oops\n0");
check("unknown command goes to stderr", sh("strace ls > /dev/null"), (out) => out.includes("command not simulated"));
check("< reads a file", sh("wc -l < /etc/passwd"), "2");
check("< missing file", sh("cat < /nope"), "bash: /nope: No such file or directory");
check("$? after success", (sh("ls /etc > /dev/null"), sh("echo $?")), "0");
check("$? after failure", (sh("ls /nope 2> /dev/null"), sh("echo $?")), "2");
check("$? for no match", (sh("grep zzz /etc/hostname"), sh("echo $?")), "1");
check("$? for unknown command", (sh("nosuchtool 2>/dev/null"), sh("echo $?")), "127");
check("a 2 that is an argument stays one", sh("echo 2 > /tmp/two.txt; cat /tmp/two.txt"), "2");

// chmod: every octal digit, special bits, and symbolic modes.
const modeOf = (path) => sh(`ls -l ${path}`).split(/\s+/)[0];
sh("touch /tmp/m; mkdir -p /tmp/d");
check("chmod 711", (sh("chmod 711 /tmp/m"), modeOf("/tmp/m")), "-rwx--x--x");
check("chmod 642", (sh("chmod 642 /tmp/m"), modeOf("/tmp/m")), "-rw-r---w-");
check("chmod 4755 sets setuid", (sh("chmod 4755 /tmp/m"), modeOf("/tmp/m")), "-rwsr-xr-x");
check("chmod 4644 shows S", (sh("chmod 4644 /tmp/m"), modeOf("/tmp/m")), "-rwSr--r--");
check("chmod 000", (sh("chmod 000 /tmp/m"), modeOf("/tmp/m")), "----------");
check("chmod u+x", (sh("chmod 644 /tmp/m; chmod u+x /tmp/m"), modeOf("/tmp/m")), "-rwxr--r--");
check("chmod +x honours no class", (sh("chmod 644 /tmp/m; chmod +x /tmp/m"), modeOf("/tmp/m")), "-rwxr-xr-x");
check("chmod +w is limited by the umask", (sh("chmod 444 /tmp/m; chmod +w /tmp/m"), modeOf("/tmp/m")), "-rw-r--r--");
check("chmod go-rx,u=rw", (sh("chmod 755 /tmp/m; chmod go-rx,u=rw /tmp/m"), modeOf("/tmp/m")), "-rw-------");
check("chmod -x is a mode", (sh("chmod 755 /tmp/m; chmod -x /tmp/m"), modeOf("/tmp/m")), "-rw-r--r--");
check("chmod +t on a directory", (sh("chmod 777 /tmp/d; chmod +t /tmp/d"), sh("ls -l /tmp").split("\n").find((l) => l.endsWith(" d")).split(/\s+/)[0]), "drwxrwxrwt");
check("chmod g+s on a directory", (sh("chmod 770 /tmp/d; chmod g+s /tmp/d"), sh("ls -l /tmp").split("\n").find((l) => l.endsWith(" d")).split(/\s+/)[0]), "drwxrws---");
check("chmod rejects a bad mode", sh("chmod 9z9 /tmp/m"), "chmod: invalid mode: '9z9'");
check("chmod reports a missing file", sh("chmod 600 /tmp/nope"), "chmod: cannot access '/tmp/nope': No such file or directory");
check("chmod -R reaches children", (sh("touch /tmp/d/inner; chmod -R 700 /tmp/d"), modeOf("/tmp/d/inner")), "-rwx------");

// Completion.
check("completes commands", completionsFor(state, "gre"), (out) => out.includes("grep"));
check("completes paths", completionsFor(state, "cat Doc"), (out) => out.some((c) => c.startsWith("Documents")));

// Destructive paths stay refused.
check("rm / refused", sh("rm -rf /"), (out) => out.includes("refusing"));

console.log(failures === 0 ? "\nall terminal checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
