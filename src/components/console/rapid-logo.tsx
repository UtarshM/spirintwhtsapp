import React from "react";

export function RapidLogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rapid-logo-svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rapidGrad1" x1="8" y1="12" x2="56" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7828" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="rapidGrad2" x1="56" y1="52" x2="8" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      {/* Upper swoosh */}
      <path
        d="M12 28C10 20 16 12 28 12C44 12 54 22 50 32C47 39 37 42 32 38C26 33 34 24 40 24C44 24 46 27 44 30C41 34 32 35 25 32C17 28 14 36 12 28Z"
        fill="url(#rapidGrad1)"
      />
      {/* Lower swoosh */}
      <path
        d="M52 36C54 44 48 52 36 52C20 52 10 42 14 32C17 25 27 22 32 26C38 31 30 40 24 40C20 40 18 37 20 34C23 30 32 29 39 32C47 36 50 28 52 36Z"
        fill="url(#rapidGrad2)"
      />
    </svg>
  );
}

export default function LeadpilotLogo({
  collapsed = false,
  size = 30,
}: {
  collapsed?: boolean;
  size?: number;
}) {
  return (
    <div className={`rapid-sales-brand ${collapsed ? "collapsed" : ""}`}>
      <RapidLogoIcon size={size} />
      {!collapsed && (
        <span className="rapid-sales-brand-text">
          Leadpilot
        </span>
      )}
    </div>
  );
}

export { LeadpilotLogo as RapidSalesLogo, LeadpilotLogo as SprintLogo };

