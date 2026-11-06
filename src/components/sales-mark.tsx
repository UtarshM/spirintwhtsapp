import type { CSSProperties } from 'react';

/** Leadpilot official logo mark - Supersonic Blue Chevron */
export default function SalesMark({ size = 24, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
    >
      <defs>
        <linearGradient id="salesMarkGrad1" x1="6" y1="8" x2="58" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="salesMarkGrad2" x1="20" y1="12" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <path
        d="M32 6L54 28L44 32L32 18L20 32L10 28L32 6Z"
        fill="url(#salesMarkGrad1)"
      />
      <path
        d="M32 24L50 42L42 46L32 34L22 46L14 42L32 24Z"
        fill="url(#salesMarkGrad2)"
        opacity="0.9"
      />
      <circle cx="32" cy="46" r="5" fill="#38bdf8" />
    </svg>
  );
}
