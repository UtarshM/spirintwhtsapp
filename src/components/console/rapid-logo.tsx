import React from "react";

export function LeadpilotLogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="leadpilot-logo-svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pilotGradMain" x1="6" y1="8" x2="58" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="pilotGradAccent" x1="20" y1="12" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <filter id="pilotGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Dynamic Pilot Wings / Navigation Chevron */}
      <path
        d="M32 6L54 28L44 32L32 18L20 32L10 28L32 6Z"
        fill="url(#pilotGradMain)"
        filter="url(#pilotGlow)"
      />
      <path
        d="M32 24L50 42L42 46L32 34L22 46L14 42L32 24Z"
        fill="url(#pilotGradAccent)"
        opacity="0.9"
      />
      {/* Propulsion Core */}
      <circle cx="32" cy="46" r="5" fill="#38bdf8" />
      <path
        d="M32 51L36 58L28 58L32 51Z"
        fill="#60a5fa"
        opacity="0.8"
      />
    </svg>
  );
}

export { LeadpilotLogoIcon as RapidLogoIcon };

export default function LeadpilotLogo({
  collapsed = false,
  size = 30,
}: {
  collapsed?: boolean;
  size?: number;
}) {
  return (
    <div className={`leadpilot-brand ${collapsed ? "collapsed" : ""}`}>
      <LeadpilotLogoIcon size={size} />
      {!collapsed && (
        <span className="leadpilot-brand-text">
          Lead<strong>pilot</strong>
        </span>
      )}
    </div>
  );
}

export { LeadpilotLogo as RapidSalesLogo, LeadpilotLogo as SprintLogo };

