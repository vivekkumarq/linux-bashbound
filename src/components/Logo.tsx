export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="currentColor" opacity="0.08" />
      <rect x="8" y="12" width="48" height="40" rx="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M16 30h7l5 12 7-24 5 12h8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="20" r="1.7" fill="var(--accent-2)" />
      <circle cx="23.5" cy="20" r="1.7" fill="var(--accent-3)" />
      <circle cx="29" cy="20" r="1.7" fill="var(--accent)" />
    </svg>
  );
}
