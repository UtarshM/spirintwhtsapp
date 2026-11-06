"use client";
import { useState } from "react";
import { MessageSquare, Sparkles, X, ChevronRight } from "lucide-react";

export default function RapidMascot({
  onNavigate,
  onOpenSetup,
}: {
  onNavigate?: (page: string) => void;
  onOpenSetup?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rapid-mascot-container">
      {open && (
        <div className="rapid-mascot-bubble" role="dialog" aria-label="AI Sales Assistant">
          <div className="rapid-mascot-bubble-header">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <strong>Sprint Copilot</strong>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rapid-mascot-close"
              aria-label="Close assistant"
            >
              <X size={14} />
            </button>
          </div>
          <p className="rapid-mascot-bubble-text">
            Hey Utkarsh! 👋 Ready to scale your outreach? What would you like to build today?
          </p>
          <div className="rapid-mascot-actions">
            <button
              onClick={() => {
                setOpen(false);
                onOpenSetup?.();
              }}
              className="rapid-mascot-action-btn primary"
            >
              <Sparkles size={13} />
              Open Setup Guide
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onNavigate?.("agents");
              }}
              className="rapid-mascot-action-btn"
            >
              Build AI Voice Agent
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onNavigate?.("wa-broadcast");
              }}
              className="rapid-mascot-action-btn"
            >
              Plan WhatsApp Broadcast
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onNavigate?.("contacts");
              }}
              className="rapid-mascot-action-btn"
            >
              Manage Contacts & Leads
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="rapid-mascot-trigger"
        onClick={() => setOpen((v) => !v)}
        title="Chat with Sprint Copilot"
        aria-label="Sprint Copilot AI Assistant"
      >
        {/* Animated Cute Blue Robot SVG */}
        <svg
          width="68"
          height="68"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="rapid-mascot-svg"
        >
          {/* Subtle glow / shadow */}
          <ellipse cx="50" cy="92" rx="30" ry="6" fill="#1e293b" fillOpacity="0.2" />

          {/* Body */}
          <rect x="25" y="46" width="50" height="42" rx="16" fill="#2563eb" />
          <rect x="29" y="50" width="42" height="34" rx="12" fill="#1d4ed8" />

          {/* Chest Screen */}
          <rect x="36" y="58" width="28" height="18" rx="6" fill="#0f172a" />
          {/* Signal / Heartbeat Line */}
          <path
            d="M40 67H44L47 62L51 72L54 65L57 67H60"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Left Arm */}
          <rect
            x="12"
            y="52"
            width="12"
            height="24"
            rx="6"
            fill="#3b82f6"
            transform="rotate(12 12 52)"
          />
          {/* Right Arm (Waving) */}
          <rect
            x="76"
            y="48"
            width="12"
            height="26"
            rx="6"
            fill="#3b82f6"
            transform="rotate(-18 76 48)"
          />

          {/* Neck */}
          <rect x="44" y="42" width="12" height="6" rx="2" fill="#64748b" />

          {/* Head */}
          <rect x="20" y="14" width="60" height="32" rx="14" fill="#3b82f6" />
          <rect x="24" y="17" width="52" height="26" rx="10" fill="#1e293b" />

          {/* Antenna */}
          <rect x="48" y="4" width="4" height="10" rx="2" fill="#94a3b8" />
          <circle cx="50" cy="4" r="5" fill="#f97316" />
          <circle cx="50" cy="4" r="2.5" fill="#fed7aa" />

          {/* Eyeglasses Frame (White/Silver) */}
          <rect
            x="28"
            y="21"
            width="20"
            height="16"
            rx="6"
            stroke="#ffffff"
            strokeWidth="2.5"
            fill="#0f172a"
          />
          <rect
            x="52"
            y="21"
            width="20"
            height="16"
            rx="6"
            stroke="#ffffff"
            strokeWidth="2.5"
            fill="#0f172a"
          />
          {/* Glasses Bridge */}
          <path d="M48 28H52" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

          {/* Eyes (Glowing cyan/blue dots) */}
          <circle cx="38" cy="29" r="4" fill="#38bdf8" />
          <circle cx="39.5" cy="27.5" r="1.5" fill="#ffffff" />
          <circle cx="62" cy="29" r="4" fill="#38bdf8" />
          <circle cx="63.5" cy="27.5" r="1.5" fill="#ffffff" />

          {/* Cheerful Smile */}
          <path
            d="M46 38Q50 41 54 38"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Ear Bolts */}
          <rect x="17" y="24" width="3" height="10" rx="1.5" fill="#94a3b8" />
          <rect x="80" y="24" width="3" height="10" rx="1.5" fill="#94a3b8" />
        </svg>
      </button>
    </div>
  );
}

