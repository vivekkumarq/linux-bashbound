/**
 * One glyph per question category.
 *
 * Small inline strokes on a shared 24-grid so the sidebar reads as a set
 * rather than a list of words. Unknown categories fall back to a generic mark.
 */
const PATHS: Record<string, string> = {
  "Linux Fundamentals": "M4 7h16M4 12h10M4 17h7",
  Unix: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5z",
  Kernel: "M9 9h6v6H9zM6 10V6h4m4 0h4v4m0 4v4h-4m-4 0H6v-4",
  Processes: "M7 5v14M12 5v14M17 5v14M4 9h6m4 0h6M4 15h6m4 0h6",
  Filesystem: "M4 6h5l2 2h9v11H4z",
  Troubleshooting: "M15 3a5 5 0 0 0-4.6 7L3 17.4V21h3.6l7.4-7.4A5 5 0 0 0 21 9l-3 3-3-3z",
  Permissions: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  Security: "M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z",
  Performance: "M12 19a8 8 0 1 1 8-8M12 19h8M12 12l4-3",
  Networking: "M12 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM5 15a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm14 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM12 9v3m0 0H6.5m5.5 0h5.5m-11 0v3m11-3v3",
  "System Administration": "M4 8h10m3 0h3M4 16h4m3 0h9M15 5v6M9 13v6",
  "DevOps/Linux": "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  Storage: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  Bash: "M4 5h16v14H4zM7 10l3 2-3 2m5 1h5",
  "Production Incidents": "M12 4 2.5 20h19zM12 10v4m0 3h.01",
  Commands: "M7 4a3 3 0 1 0 3 3v10a3 3 0 1 1-3-3h10a3 3 0 1 0-3-3V7a3 3 0 1 1 3 3H7Z",
  Shell: "M4 5h16v14H4zM7 10l3 2-3 2",
  Containers: "M3 9h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9l3-5h12l3 5M9 4v5m6-5v5",
  Memory: "M7 8h10v8H7zM9 4v4m6-4v4M9 16v4m6-4v4M4 10h3m-3 4h3m10-4h3m-3 4h3",
};

const FALLBACK = "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5h.01M11 12h1v5h1";

export function CategoryIcon({ name, size = 17 }: { name: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name] ?? FALLBACK} />
    </svg>
  );
}
