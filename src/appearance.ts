export const themes = [
  { id: "light", label: "Light", kind: "light", swatch: "#f6f7f9", accent: "#3b6cf6" },
  { id: "paper", label: "Paper", kind: "light", swatch: "#fbf8f3", accent: "#a2662a" },
  { id: "dark", label: "Dark", kind: "dark", swatch: "#0b0d12", accent: "#6f95ff" },
  { id: "midnight", label: "Midnight", kind: "dark", swatch: "#0a0a18", accent: "#a78bfa" },
  { id: "forest", label: "Forest", kind: "dark", swatch: "#0a1210", accent: "#4fd1a5" },
  { id: "contrast", label: "Contrast", kind: "dark", swatch: "#000000", accent: "#ffd400" },
  { id: "system", label: "System", kind: "system", swatch: "#888888", accent: "#3b6cf6" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const fonts = [
  { id: "sans", label: "Inter", sample: "Aa", family: '"Inter", "Segoe UI", system-ui, sans-serif' },
  { id: "serif", label: "Serif", sample: "Aa", family: 'Georgia, "Source Serif 4", "Times New Roman", serif' },
  { id: "mono", label: "Mono", sample: "Aa", family: '"JetBrains Mono", ui-monospace, monospace' },
] as const;

export type FontId = (typeof fonts)[number]["id"];

export function isThemeId(v: string): v is ThemeId {
  return themes.some((t) => t.id === v);
}

export function isFontId(v: string): v is FontId {
  return fonts.some((f) => f.id === v);
}

export function resolvePalette(theme: ThemeId, prefersLight: boolean): Exclude<ThemeId, "system"> {
  if (theme === "system") return prefersLight ? "light" : "dark";
  return theme;
}

export function paletteIsDark(palette: Exclude<ThemeId, "system">) {
  return palette === "dark" || palette === "midnight" || palette === "forest" || palette === "contrast";
}

export function fontLabel(id: FontId) {
  return fonts.find((f) => f.id === id)?.label ?? "Inter";
}
