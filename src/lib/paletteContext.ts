import { createContext, useContext } from "react";

export interface PaletteApi {
  open: boolean;
  tab: "jump" | "bash";
  seed: string | null;
  runKey: number;
  openJump: () => void;
  openBash: (command?: string) => void;
  close: () => void;
}

export const PaletteContext = createContext<PaletteApi | null>(null);

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("Palette missing");
  return ctx;
}

export function extractRunnable(code: string) {
  const line = code.split("\n").find((l) => l.trim().startsWith("$")) ?? code.split("\n")[0] ?? "";
  return line.replace(/^\$\s*/, "").trim();
}
