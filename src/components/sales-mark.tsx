import type { CSSProperties } from 'react';

/** Shared Leadpilot logo mark for product identity */
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
        <linearGradient id="salesMarkGrad1" x1="8" y1="12" x2="56" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7828" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="salesMarkGrad2" x1="56" y1="52" x2="8" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <path
        d="M12 28C10 20 16 12 28 12C44 12 54 22 50 32C47 39 37 42 32 38C26 33 34 24 40 24C44 24 46 27 44 30C41 34 32 35 25 32C17 28 14 36 12 28Z"
        fill="url(#salesMarkGrad1)"
      />
      <path
        d="M52 36C54 44 48 52 36 52C20 52 10 42 14 32C17 25 27 22 32 26C38 31 30 40 24 40C20 40 18 37 20 34C23 30 32 29 39 32C47 36 50 28 52 36Z"
        fill="url(#salesMarkGrad2)"
      />
    </svg>
  );
}
