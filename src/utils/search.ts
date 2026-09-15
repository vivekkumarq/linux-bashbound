export function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9/+.-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreMatch(query: string, haystack: string) {
  const q = tokenize(query);
  if (!q.length) return 0;
  const h = haystack.toLowerCase();
  let score = 0;
  for (const token of q) {
    if (h.includes(token)) score += 3;
    else if (h.split(/\s+/).some((w) => w.startsWith(token))) score += 1;
  }
  if (h.startsWith(query.toLowerCase())) score += 4;
  return score;
}
