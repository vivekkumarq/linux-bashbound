import { levels } from "../data/roadmap";
import { topicMap, topics } from "../data/topics";
import type { ProgressState, RoadmapLevel, Topic } from "../types";

/**
 * Derived learning state.
 *
 * Everything the roadmap, the "continue learning" strip and the mastery
 * readout show is computed here from the stored progress, so the rules live in
 * one place instead of being re-derived slightly differently on each page.
 */

/** Topics in the order the roadmap presents them. */
export const courseOrder: Topic[] = levels.flatMap((level) =>
  level.topics.map((slug) => topicMap.get(slug)).filter((t): t is Topic => Boolean(t)),
);

export type LevelStatus = "Locked" | "Available" | "In Progress" | "Completed" | "Mastered";

export function levelCompletion(level: RoadmapLevel, progress: ProgressState) {
  const done = level.topics.filter((slug) => progress.completedTopics.includes(slug)).length;
  return { done, total: level.topics.length, percent: level.topics.length ? Math.round((done / level.topics.length) * 100) : 0 };
}

/**
 * A level unlocks when every prerequisite level is finished. "Mastered" adds
 * a second bar on top of completion: the learner has also answered interview
 * questions from this level's topics.
 */
export function levelStatus(level: RoadmapLevel, progress: ProgressState): LevelStatus {
  const { done, total } = levelCompletion(level, progress);
  const prereqsMet = level.prerequisites.every((id) => {
    const prereq = levels.find((l) => l.id === id);
    if (!prereq) return true;
    return levelCompletion(prereq, progress).done === prereq.topics.length;
  });

  if (done === total && total > 0) {
    const mastered = level.topics.every((slug) => topicMastery(slug, progress).percent >= 75);
    return mastered ? "Mastered" : "Completed";
  }
  if (done > 0) return "In Progress";
  return prereqsMet ? "Available" : "Locked";
}

/**
 * Mastery is four independent signals rather than one "completed" flag, so
 * reading a page does not look the same as being able to use it.
 */
export function topicMastery(slug: string, progress: ProgressState) {
  const read = progress.completedTopics.includes(slug);
  const practiced = (progress.practicedTopics ?? []).includes(slug);

  // A quiz records which modules its questions came from, so this is an exact
  // match rather than a guess based on category names lining up.
  const quizzed = (progress.quizHistory ?? []).some(
    (entry) => entry.total > 0 && entry.score / entry.total >= 0.7 && (entry.topics ?? []).includes(slug),
  );

  // Recorded when a question is marked mastered in the arena, which already
  // has the question and its related topics in hand. Deriving it here instead
  // would mean loading the whole question bank on every roadmap render.
  const interviewed = (progress.interviewedTopics ?? []).includes(slug);

  const steps = [read, practiced, quizzed, interviewed];
  const percent = Math.round((steps.filter(Boolean).length / steps.length) * 100);
  return { read, practiced, quizzed, interviewed, percent };
}

/** The next thing to open: first unfinished topic in roadmap order. */
export function nextTopic(progress: ProgressState): Topic | null {
  return courseOrder.find((t) => !progress.completedTopics.includes(t.slug)) ?? null;
}

/** Where the learner is in the whole course, for the "lesson N of M" readout. */
export function coursePosition(slug: string) {
  const index = courseOrder.findIndex((t) => t.slug === slug);
  return { index, position: index + 1, total: courseOrder.length };
}

/** Previous and next lesson in roadmap order. */
export function lessonNeighbours(slug: string) {
  const index = courseOrder.findIndex((t) => t.slug === slug);
  return {
    previous: index > 0 ? courseOrder[index - 1] : null,
    next: index >= 0 && index < courseOrder.length - 1 ? courseOrder[index + 1] : null,
  };
}

export function overallPercent(progress: ProgressState) {
  if (!topics.length) return 0;
  return Math.round((progress.completedTopics.length / topics.length) * 100);
}
