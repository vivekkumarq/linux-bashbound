export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size * 0.58} height={size * 0.58} fill="none">
        <path
          d="M12 8.5c2.4-.9 5.8-.6 7.2 1.4.9 1.3.8 3-.2 4.2-1.2 1.4-3.2 1.8-5 2.1v.4c1.9.2 4.1.7 5.4 2.2 1.2 1.4 1.1 3.5-.1 4.8-1.6 1.8-5.1 2.2-7.6 1.1"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M16 6.2v19.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
