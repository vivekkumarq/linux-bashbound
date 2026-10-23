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

// rm: refusals depend on the path, not how it was spelled.
check("rm -rf ~ refused", (sh("rm -rf ~"), sh("ls ~")), (out) => out.includes("Documents"));
check("rm -rf /home/ refused", (sh("rm -rf /home/"), sh("ls /home")), "student");
check("rm -r . refused", (sh("cd /tmp/d"), sh("rm -r .")), (out) => out.includes("refusing to remove '.' or '..'"));
check("cwd survives rm -r .", sh("ls"), "inner");
sh("cd ~");
check("rm -R works", (sh("mkdir -p /tmp/r1/x; rm -R /tmp/r1"), sh("ls /tmp/r1")), (out) => out.includes("No such file"));
check("rm -rfv works", (sh("mkdir -p /tmp/r2/x; rm -rfv /tmp/r2"), sh("ls /tmp/r2")), (out) => out.includes("No such file"));
check("rm -f is quiet about missing files", sh("rm -f /tmp/never"), "");
check("rm carries on past an error", (sh("touch /tmp/k1; rm /tmp/never /tmp/k1"), sh("ls /tmp/k1")), (out) => out.includes("No such file"));
check("rm with no operand", sh("rm"), "rm: missing operand");

// cp and mv never lose the source by moving it onto itself.
sh("mkdir -p /tmp/cm; cd /tmp/cm; echo keep > f");
check("mv f f keeps the file", (sh("mv f f"), sh("cat f")), "keep");
check("mv f . keeps the file", sh("mv f ."), "mv: 'f' and './f' are the same file");
check("cat after mv f .", sh("cat f"), "keep");
check("mv dir into itself is refused", (sh("mkdir sub; mv sub sub/inner"), sh("ls")), (out) => out.includes("sub"));
check("cp many into a directory", (sh("echo a > a; echo b > b; mkdir out; cp a b out"), sh("ls out")), "a  b");
check("cp many needs a directory", sh("cp a b f"), "cp: target 'f' is not a directory");
check("cp a directory needs -r", sh("cp sub sub2"), "cp: -r not specified; omitting directory 'sub'");
check("cp -r copies a directory", (sh("cp -r sub sub2"), sh("ls")), (out) => out.includes("sub2"));
check("cp reports a missing source", sh("cp nope x"), "cp: cannot stat 'nope': No such file or directory");
check("mv renames", (sh("mv a renamed"), sh("ls")), (out) => out.includes("renamed") && !/\ba\b/.test(out.replace("renamed", "")));
check("mv ~ is refused", (sh("mv ~ /tmp/stolen"), sh("ls /home")), "student");
sh("cd ~");

// which, type and man know every simulated command, filters included.
check("which sort", sh("which sort"), "/usr/bin/sort");
check("which finds nothing for cd", (sh("which cd"), sh("echo $?")), "1");
check("type cd", sh("type cd"), "cd is a shell builtin");
check("type ls", sh("type ls"), "ls is /usr/bin/ls");
check("type find", sh("type find"), "find is /usr/bin/find");
check("type unknown", sh("type nosuch"), "bash: type: nosuch: not found");
check("man sort", sh("man sort"), (out) => out.startsWith("SORT(1)"));
check("man 1p printf skips the section", sh("man 1p printf"), (out) => out.startsWith("PRINTF(1)"));

// Names that exist on every JavaScript object are not commands.
for (const name of ["toString", "constructor", "valueOf", "__proto__", "hasOwnProperty"]) {
  check(`${name} is not simulated`, sh(name), (out) => out.includes("command not simulated"));
}
// ...nor are they files.
check("ls constructor", sh("ls constructor"), "ls: cannot access 'constructor': No such file or directory");
check("touch toString makes a file", (sh("cd /tmp; touch toString"), sh("ls toString")), "toString");
check("cat valueOf", sh("cat valueOf"), "cat: valueOf: No such file or directory");
sh("cd ~");
check("the shell still works afterwards", sh("pwd"), "/home/student");

// tr: classes, escapes, and -s only squeezing the named characters.
check("tr classes", sh("echo hello | tr '[:lower:]' '[:upper:]'"), "HELLO");
check("tr space to newline", sh("echo a b c | tr ' ' '\\n'"), "a\nb\nc");
check("tr -s squeezes only the set", sh("echo 'hello   world' | tr -s ' '"), "hello world");
check("tr -d with a class", sh("echo abc123 | tr -d '[:digit:]'"), "abc");
check("tr escapes both ways", sh("echo a-b | tr - '\\t' | tr -d '\\t'"), "ab");

// sed s///: per line, sed's replacement syntax, BRE by default.
check("sed without g changes every line once", sh("sed 's/INFO/I/' /var/log/syslog"), "I boot complete\nERROR disk simulated\nI ok");
check("sed g replaces all on a line", sh("echo aaa | sed 's/a/b/g'"), "bbb");
check("sed & is the match", sh("echo cat | sed 's/cat/[&]/'"), "[cat]");
check("sed \\1 is a group in a BRE", sh("echo 'john smith' | sed 's/\\(\\w*\\) \\(\\w*\\)/\\2, \\1/'"), "smith, john");
check("sed -E groups", sh("echo 'john smith' | sed -E 's/(\\w+) (\\w+)/\\2 \\1/'"), "smith john");
check("sed BRE + is literal", sh("echo 'a+b' | sed 's/a+b/x/'"), "x");
check("sed $ in the replacement is literal", sh("echo price | sed 's/price/$5/'"), "$5");
check("sed other delimiter", sh("echo /usr/bin | sed 's|/usr|/opt|'"), "/opt/bin");
check("sed -i edits the file", (sh("echo old > /tmp/s.txt; sed -i 's/old/new/' /tmp/s.txt"), fileText("/tmp/s.txt")), "new\n");
check("sed refuses what it cannot do", sh("sed -n '1,5p' /etc/passwd"), (out) => out.includes("not simulated"));

// grep: BRE by default, the common flags, several files, -r.
check("grep BRE alternation", sh("grep 'boot\\|ok' /var/log/syslog"), "INFO boot complete\nINFO ok");
check("grep BRE | is literal", sh("grep 'boot|ok' /var/log/syslog"), "");
check("grep -E alternation", sh("grep -E 'boot|ok' /var/log/syslog"), "INFO boot complete\nINFO ok");
check("grep -F is fixed", sh("echo 'a.c abc' | grep -o -F 'a.c'"), "a.c");
check("grep -w", sh("printf 'ok\\nbook\\n' | grep -w ok"), "ok");
check("grep -x", sh("printf 'ok\\nok ok\\n' | grep -x ok"), "ok");
check("grep -o", sh("echo 'id=1 id=22' | grep -oE '[0-9]+'"), "1\n22");
check("grep -l", sh("grep -l root /etc/passwd /etc/hostname"), "/etc/passwd");
check("grep labels several files", sh("grep -c o /etc/passwd /etc/hostname"), "/etc/passwd:2\n/etc/hostname:1");
check("grep -r", sh("grep -r ERROR /var"), "/var/log/syslog:ERROR disk simulated");
check("grep -i -n", sh("grep -in error /var/log/syslog"), "2:ERROR disk simulated");
check("grep -e twice", sh("grep -e boot -e ok /var/log/syslog | wc -l"), "2");
check("grep keeps going past a missing file", sh("grep root /nope /etc/passwd"), "grep: /nope: No such file or directory\n/etc/passwd:root:x:0:0:root:/root:/bin/bash");
check("grep on a directory", sh("grep x /etc"), "grep: /etc: Is a directory");
check("grep -c on empty input is 0", sh("grep -c '^$' /dev/null"), "0");
check("grep -q is silent", (sh("grep -q root /etc/passwd"), sh("grep -q root /etc/passwd; echo $?")), "0");
check("grep -A is not silently ignored", sh("grep -A 2 ERROR /var/log/syslog"), "grep: -A is not simulated here");

// printf formats, and reuses the format for extra arguments.
check("printf %s per argument", sh("printf '%s\\n' ls -l /tmp"), "ls\n-l\n/tmp");
check("printf zero padding", sh("printf '%04d\\n' 7"), "0007");
check("printf width and left align", sh("printf '[%5s][%-3s]' ab c"), "[   ab][c  ]");
check("printf precision", sh("printf '%.2f %x %o %%' 3.14159 255 8"), "3.14 ff 10 %");
check("printf with no format", sh("printf"), (out) => out.includes("usage"));
check("echo -e interprets escapes", sh("echo -e 'a\\tb'"), "a\tb");
check("echo -n is an option", sh("echo -n hi"), "hi");
check("echo leaves other dashes alone", sh("echo -x"), "-x");

// head and tail counts.
sh("seq 5 > /tmp/five");
check("head -n 2", sh("head -n 2 /tmp/five"), "1\n2");
check("head -3", sh("head -3 /tmp/five"), "1\n2\n3");
check("head -n 0 prints nothing", sh("head -n 0 /tmp/five"), "");
check("head -n -2 drops the last two", sh("head -n -2 /tmp/five"), "1\n2\n3");
check("tail -n 2", sh("tail -n 2 /tmp/five"), "4\n5");
check("tail -n +4 starts at line 4", sh("tail -n +4 /tmp/five"), "4\n5");
check("tail -n 0 prints nothing", sh("tail -n 0 /tmp/five"), "");
check("head 5 reads a file named 5", (sh("echo x > /tmp/5; cd /tmp"), sh("head 5")), "x");
sh("cd ~");
check("head of two files has headers", sh("head -n 1 /tmp/five /etc/hostname"), "==> /tmp/five <==\n1\n\n==> /etc/hostname <==\nbashbound");
check("head with a bad count", sh("head -n x /tmp/five"), "head: invalid number of lines: 'x'");

// Completion.
check("completes commands", completionsFor(state, "gre"), (out) => out.includes("grep"));
check("completes paths", completionsFor(state, "cat Doc"), (out) => out.some((c) => c.startsWith("Documents")));

// Destructive paths stay refused.
check("rm / refused", sh("rm -rf /"), (out) => out.includes("dangerous to operate recursively on '/'"));
check("/ is still there", sh("ls /"), (out) => out.includes("etc") && out.includes("home"));

console.log(failures === 0 ? "\nall terminal checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
