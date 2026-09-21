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

export interface Stage {
  /** The command text for this stage, redirection already removed. */
  command: string;
}

export interface ParsedLine {
  stages: Stage[];
  redirect: { target: string; append: boolean } | null;
  error?: string;
}

/** Splits on `|` and trailing `>`/`>>`, ignoring both inside quotes. */
export function parseLine(line: string): ParsedLine {
  const stages: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "|") {
      stages.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  if (quote) return { stages: [], redirect: null, error: "unexpected EOF while looking for matching quote" };
  stages.push(current);

  // Redirection is only recognised on the final stage, which matches how a
  // real shell attaches it to the last command in the pipeline.
  let redirect: ParsedLine["redirect"] = null;
  const last = stages[stages.length - 1];
  const match = /\s*(>>|>)\s*([^\s|<>]+)\s*$/.exec(last);
  if (match) {
    redirect = { target: match[2], append: match[1] === ">>" };
    stages[stages.length - 1] = last.slice(0, match.index);
  }

  const trimmed = stages.map((s) => s.trim());
  if (trimmed.some((s) => s === "")) {
    return { stages: [], redirect, error: "syntax error near unexpected token `|'" };
  }

  return { stages: trimmed.map((command) => ({ command })), redirect };
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

export function hasGlob(word: string) {
  return /[*?]/.test(word);
}

/**
 * Unsupported shell syntax. Saying so plainly is better than silently doing
 * something different from what a real shell would do.
 */
export function unsupportedSyntax(line: string): string | null {
  if (/\$\(|`/.test(line)) return "Command substitution is not simulated here. See /learn/bash-scripting.";
  if (/\b(for|while|until|if|case)\b/.test(line)) {
    return "Control flow is not simulated here. The Bash scripting module covers it: /learn/bash-scripting.";
  }
  if (/&&|\|\|/.test(line)) return "Command lists (&& and ||) are not simulated here. Run the commands one at a time.";
  if (/<</.test(line)) return "Here-documents are not simulated here.";
  return null;
}
