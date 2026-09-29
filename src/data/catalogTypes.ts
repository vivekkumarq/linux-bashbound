import type { Difficulty } from "../types";

/**
 * The shape of the generated curriculum index.
 *
 * Deliberately link-level: enough to list, order, count and navigate to a
 * module, but none of the concept bodies. Lesson pages import the full
 * `topics` corpus; everything else works from this.
 */
export interface CatalogTopic {
  slug: string;
  title: string;
  summary: string;
  difficulty: Exclude<Difficulty, "Expert">;
  minutes: number;
  level: number;
  /** How many concepts the full module contains. */
  concepts: number;
}

export interface CatalogLevel {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  difficulty: Exclude<Difficulty, "Expert">;
  hours: number;
  topics: string[];
  prerequisites: number[];
}
