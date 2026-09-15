import type { FontId, ThemeId } from "../appearance";
import { isFontId, isThemeId } from "../appearance";
import type { ProgressState } from "../types";

export const STORAGE_KEY = "linux-bashbound-v2";

export const defaultProgress = (): ProgressState => ({
  completedTopics: [],
  bookmarkedQuestions: [],
  masteredQuestions: [],
  seenQuestions: [],
  quizHistory: [],
  challengeDays: [],
  lastVisit: null,
  streak: 0,
  theme: "dark",
  font: "sans",
});

export function loadProgress(): ProgressState {
  const base = defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("linux-bashbound-v1");
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const theme = parsed.theme && isThemeId(parsed.theme) ? (parsed.theme as ThemeId) : base.theme;
    const font = parsed.font && isFontId(parsed.font) ? (parsed.font as FontId) : base.font;
    return { ...base, ...parsed, theme, font };
  } catch {
    return base;
  }
}

export function saveProgress(state: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function updateStreak(state: ProgressState): ProgressState {
  const today = todayKey();
  if (state.lastVisit === today) return state;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  const streak = state.lastVisit === y ? state.streak + 1 : 1;
  return { ...state, lastVisit: today, streak };
}
