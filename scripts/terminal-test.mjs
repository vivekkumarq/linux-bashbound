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
check("redirect wrote the file", sh("cat /tmp/out.txt"), "written\n");
sh("echo second >> /tmp/out.txt");
check("append", sh("cat /tmp/out.txt"), "written\nsecond\n");
check("pipeline into redirect", (sh("seq 3 | sort -rn > /tmp/nums.txt"), sh("cat /tmp/nums.txt")), "3\n2\n1\n");

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

// Completion.
check("completes commands", completionsFor(state, "gre"), (out) => out.includes("grep"));
check("completes paths", completionsFor(state, "cat Doc"), (out) => out.some((c) => c.startsWith("Documents")));

// Destructive paths stay refused.
check("rm / refused", sh("rm -rf /"), (out) => out.includes("refusing"));

console.log(failures === 0 ? "\nall terminal checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
