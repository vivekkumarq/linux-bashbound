import { catalogLevels, catalogTopics } from "../data/catalog.generated";
import type { CatalogLevel, CatalogTopic } from "../data/catalogTypes";
import type { ProgressState } from "../types";

/**
 * Derived learning state.
 *
 * Everything the roadmap, the "continue learning" strip and the mastery
 * readout show is computed here from the stored progress, so the rules live in
 * one place instead of being re-derived slightly differently on each page.
 *
 * It reads the generated catalog rather than the lesson corpus. Every page
 * needs to know the shape of the course; only a lesson page needs its text,
 * and importing the corpus here put 249 kB on the critical path of the home
 * page, the roadmap and the dashboard alike.
 */

const topicBySlug = new Map(catalogTopics.map((t) => [t.slug, t]));

export { catalogLevels as levels, catalogTopics as courseTopics, topicBySlug };

/** Topics in the order the roadmap presents them. */
export const courseOrder: CatalogTopic[] = catalogLevels.flatMap((level) =>
  level.topics.map((slug) => topicBySlug.get(slug)).filter((t): t is CatalogTopic => Boolean(t)),
);

export type LevelStatus = "Locked" | "Available" | "In Progress" | "Completed" | "Mastered";

export function levelCompletion(level: CatalogLevel, progress: ProgressState) {
  const done = level.topics.filter((slug) => progress.completedTopics.includes(slug)).length;
  return {
    done,
    total: level.topics.length,
    percent: level.topics.length ? Math.round((done / level.topics.length) * 100) : 0,
  };
}

/**
 * A level unlocks when every prerequisite level is finished. "Mastered" adds
 * a second bar on top of completion: the learner has also been tested on it.
 */
export function levelStatus(level: CatalogLevel, progress: ProgressState): LevelStatus {
  const { done, total } = levelCompletion(level, progress);
  const prereqsMet = level.prerequisites.every((id) => {
    const prereq = catalogLevels.find((l) => l.id === id);
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

  // Recorded when a question is marked known in the arena, which already has
  // the question and its related topics in hand.
  const interviewed = (progress.interviewedTopics ?? []).includes(slug);

  const steps = [read, practiced, quizzed, interviewed];
  const percent = Math.round((steps.filter(Boolean).length / steps.length) * 100);
  return { read, practiced, quizzed, interviewed, percent };
}

/** The next thing to open: first unfinished topic in roadmap order. */
export function nextTopic(progress: ProgressState): CatalogTopic | null {
  return courseOrder.find((t) => !progress.completedTopics.includes(t.slug)) ?? null;
}

/** Where the learner is in the whole course, for the "module N of M" readout. */
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
  if (!courseOrder.length) return 0;
  return Math.round((progress.completedTopics.length / courseOrder.length) * 100);
}
