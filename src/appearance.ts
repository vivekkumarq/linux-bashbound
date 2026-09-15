export const themes = [
  { id: "dark", label: "Dark", kind: "dark", swatch: "#0b1118", accent: "#3bbf86" },
  { id: "midnight", label: "Midnight", kind: "dark", swatch: "#07070f", accent: "#7aa2f7" },
  { id: "forest", label: "Forest", kind: "dark", swatch: "#0c1410", accent: "#7dce82" },
  { id: "light", label: "Light", kind: "light", swatch: "#f4f1ea", accent: "#157a54" },
  { id: "paper", label: "Paper", kind: "light", swatch: "#f7f1e3", accent: "#9a5b1f" },
  { id: "contrast", label: "Contrast", kind: "dark", swatch: "#000000", accent: "#ffe14a" },
  { id: "system", label: "System", kind: "system", swatch: "#888888", accent: "#3bbf86" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const fonts = [
  { id: "sans", label: "Sans", sample: "Aa", family: '"Outfit", "Source Sans 3", sans-serif' },
  { id: "humanist", label: "Humanist", sample: "Aa", family: '"IBM Plex Sans", "Source Sans 3", sans-serif' },
  { id: "serif", label: "Serif", sample: "Aa", family: '"Source Serif 4", Georgia, serif' },
  { id: "rounded", label: "Rounded", sample: "Aa", family: '"Nunito", "Source Sans 3", sans-serif' },
  { id: "mono", label: "Mono", sample: "Aa", family: '"IBM Plex Mono", ui-monospace, monospace' },
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
