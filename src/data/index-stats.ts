// Aggregated content counts and integrity checks, consumed by
// scripts/content-stats.mjs. Kept out of the app bundle: the UI reads the
// generated stats.generated.ts instead so it never imports the whole corpus.
import { questions, mcqQuestionCount } from "./questions";
import { commands } from "./commands";
import { topics, topicMap } from "./topics";
import { levels } from "./roadmap";
import { challenges } from "./challenges";
import { labs } from "./labs";
import { cheatSheets } from "./cheatsheets";

export const stats = {
  questions: questions.length,
  mcq: mcqQuestionCount,
  commands: commands.length,
  topics: topics.length,
  concepts: topics.reduce((n, t) => n + t.concepts.length, 0),
  levels: levels.length,
  challenges: challenges.length,
  labs: labs.length,
  cheatSheets: cheatSheets.length,
};

/**
 * Integrity problems that would surface as a broken page rather than a build
 * error. Each entry is a human-readable line; a non-empty list fails the build.
 */
export const problems: string[] = [];

// A multiple-choice question whose answer is not among its choices cannot be
// answered correctly by anyone.
for (const q of questions) {
  if (q.choices?.length && (q.correctIndex ?? -1) < 0) {
    problems.push(`MCQ answer not among choices: "${q.question}"`);
  }
}

// Every slug a roadmap level lists must be a real topic, or the roadmap
// renders a chip that 404s.
for (const level of levels) {
  for (const slug of level.topics) {
    if (!topicMap.has(slug)) {
      problems.push(`Level ${level.id} (${level.title}) lists unknown topic "${slug}"`);
    }
  }
}

// Every topic must be reachable from the roadmap, otherwise it exists but
// nothing links to it.
const onRoadmap = new Set(levels.flatMap((l) => l.topics));
for (const topic of topics) {
  if (!onRoadmap.has(topic.slug)) {
    problems.push(`Topic "${topic.slug}" is not listed on any roadmap level`);
  }
}

// Prerequisites must resolve, or the lesson page links nowhere.
for (const topic of topics) {
  for (const slug of topic.prerequisites) {
    if (!topicMap.has(slug)) {
      problems.push(`Topic "${topic.slug}" has unknown prerequisite "${slug}"`);
    }
  }
}

// Hand-written multiple-choice questions link to the module that teaches
// them, both from the arena and from the quiz results. A slug that does not
// resolve is a dead "study this next" link, so those are hard failures.
// Generated questions inherit their slugs from the lesson they came from.
for (const q of questions) {
  if (!q.choices?.length) continue;
  for (const slug of q.relatedTopics) {
    if (!topicMap.has(slug)) {
      problems.push(`Quiz question "${q.question}" points at unknown module "${slug}"`);
    }
  }
}

/**
 * Non-fatal notes. Commands may legitimately point at tools the explorer does
 * not document (mtr, pgrep, ripgrep). The command page renders those as plain
 * text rather than links, so they are worth listing but do not fail the build.
 */
export const notes: string[] = [];

const commandNames = new Set(commands.map((c) => c.name));
const undocumented = new Set<string>();
for (const command of commands) {
  for (const related of command.related) {
    if (!commandNames.has(related)) undocumented.add(related);
  }
}
if (undocumented.size) {
  notes.push(
    `${undocumented.size} referenced tools are not in the explorer: ${[...undocumented].sort().join(", ")}`,
  );
}
