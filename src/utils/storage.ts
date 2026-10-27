import type { ThemeId } from "../appearance";
import { isFontId, isThemeId } from "../appearance";
import type { ProgressState } from "../types";

export const STORAGE_KEY = "linux-bashbound-v2";

export const defaultProgress = (): ProgressState => ({
  completedTopics: [],
  practicedTopics: [],
  interviewedTopics: [],
  track: null,
  focusMode: false,
  seenBoot: false,
  bookmarkedQuestions: [],
  masteredQuestions: [],
  seenQuestions: [],
  quizHistory: [],
  challengeDays: [],
  activeDays: [],
  lastVisit: null,
  streak: 0,
  theme: "system",
  font: "sans",
});

export function loadProgress(): ProgressState {
  const base = defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("linux-bashbound-v1");
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const theme = parsed.theme && isThemeId(parsed.theme) ? (parsed.theme as ThemeId) : base.theme;
    const rawFont = String(parsed.font ?? "");
    const font = isFontId(rawFont) ? rawFont : base.font;
    return { ...base, ...parsed, theme, font };
  } catch {
    return base;
  }
}

export function saveProgress(state: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * A local calendar date as YYYY-MM-DD. toISOString() gives the UTC date,
 * which in India rolls over at 05:30 and in California mid-evening, so a
 * day's activity landed on the wrong day of the heatmap and streak.
 */
export function dayKey(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey() {
  return dayKey();
}

export function updateStreak(state: ProgressState): ProgressState {
  const today = todayKey();
  if (state.lastVisit === today) return state;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = dayKey(yesterday);
  const streak = state.lastVisit === y ? state.streak + 1 : 1;
  // Roughly a year of history is plenty for a twelve-week heatmap and keeps
  // the stored object small.
  const activeDays = [...new Set([...(state.activeDays ?? []), today])].slice(-400);
  return { ...state, lastVisit: today, streak, activeDays };
}
