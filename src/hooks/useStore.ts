import { createContext, useContext } from "react";
import type { FontId, ThemeId } from "../appearance";
import type { ProgressState } from "../types";

export interface AppStore {
  progress: ProgressState;
  setProgress: (next: ProgressState | ((p: ProgressState) => ProgressState)) => void;
  themeResolved: "dark" | "light";
  setTheme: (t: ThemeId) => void;
  setFont: (f: FontId) => void;
}

export const StoreContext = createContext<AppStore | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}
