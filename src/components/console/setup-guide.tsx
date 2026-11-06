"use client";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  ArrowRight,
  Phone,
  MessageSquare,
  Mail,
  Users,
  Megaphone,
} from "lucide-react";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  channel: string;
  icon: typeof MessageSquare;
  route: string;
  recommendedTime: string;
}

const STEPS: SetupStep[] = [
  {
    id: "whatsapp",
    title: "Connect WhatsApp Business API",
    description: "Connect your official Meta WhatsApp Business account, verify phone number, and register templates.",
    channel: "WhatsApp",
    icon: MessageSquare,
    route: "wa-onboarding",
    recommendedTime: "3 mins",
  },
  {
    id: "ai-calling",
    title: "Configure AI Voice Calling Agent",
    description: "Design conversational speech prompts, choose human-like voice, and test preview calls.",
    channel: "AI Calling",
    icon: Phone,
    route: "agents",
    recommendedTime: "4 mins",
  },
  {
    id: "email",
    title: "Connect Email Mailbox",
    description: "Authorize Gmail, Zoho, or SMTP sender credentials and establish SPF/DKIM authentication.",
    channel: "Email",
    icon: Mail,
    route: "email-setup",
    recommendedTime: "2 mins",
  },
  {
    id: "contacts",
    title: "Import Audience Contacts",
    description: "Upload your customer phone & email list via CSV with consent flags and custom variables.",
    channel: "Audience",
    icon: Users,
    route: "contacts",
    recommendedTime: "2 mins",
  },
  {
    id: "campaign",
    title: "Launch First Outreach Campaign",
    description: "Schedule a high-converting broadcast across WhatsApp, Email, or automated AI Calling.",
    channel: "Campaigns",
    icon: Megaphone,
    route: "campaigns",
    recommendedTime: "5 mins",
  },
];

export default function SetupGuide({
  isOpen,
  onClose,
  onNavigate,
  onOpenWizard,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onOpenWizard?: () => void;
}) {
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["contacts"];
    try {
      const stored = localStorage.getItem("rapid_setup_completed");
      return stored ? JSON.parse(stored) : ["contacts"];
    } catch {
      return ["contacts"];
    }
  });

  const toggleStep = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCompletedSteps((prev) => {
      const next = prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id];
      try {
        localStorage.setItem("rapid_setup_completed", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  if (!isOpen) return null;

  return (
    <div className="setup-guide-overlay" onClick={onClose} role="presentation">
      <aside
        className="setup-guide-drawer"
        role="dialog"
        aria-label="Sprint Setup Guide"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="setup-guide-header">
          <div className="setup-guide-header-title">
            <div className="setup-guide-badge">
              <Sparkles size={15} />
              <span>ONBOARDING CHECKLIST</span>
            </div>
            <h2>Setup Guide</h2>
            <p>Complete these 5 steps to make your multi-channel sales engine fully operational.</p>
          </div>
          <button
            className="setup-guide-close-btn"
            onClick={onClose}
            aria-label="Close setup guide"
          >
            <X size={18} />
          </button>
        </header>

        {/* Progress Bar */}
        <div className="setup-guide-progress-box">
          <div className="setup-guide-progress-labels">
            <span>Overall Progress</span>
            <strong>
              {completedSteps.length} of {STEPS.length} completed ({progress}%)
            </strong>
          </div>
          <div className="setup-guide-progress-track">
            <div
              className="setup-guide-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Fast-Track Industry Wizard Card */}
        {onOpenWizard && (
          <div
            style={{
              margin: "0 20px 16px 20px",
              padding: "16px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
              border: "1px solid #c7d2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#4338ca", textTransform: "uppercase" }}>
                <Sparkles size={12} />
                <span>1-Click Fast Track</span>
              </div>
              <strong style={{ fontSize: 13, color: "#1e1b4b" }}>Launch with Industry Pack</strong>
              <div style={{ fontSize: 11, color: "#475569" }}>Auto-loads E-Commerce, Real Estate, or SaaS templates & 500 trial credits.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWizard();
              }}
              style={{
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>Launch</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Steps List */}
        <div className="setup-guide-steps-list">
          {STEPS.map((step, index) => {
            const isDone = completedSteps.includes(step.id);
            const Icon = step.icon;
            return (
              <article
                key={step.id}
                className={`setup-guide-step-card ${isDone ? "completed" : ""}`}
                onClick={() => {
                  onNavigate(step.route);
                  onClose();
                }}
              >
                <div className="setup-guide-step-top">
                  <button
                    type="button"
                    className="setup-guide-checkbox"
                    onClick={(e) => toggleStep(step.id, e)}
                    title={isDone ? "Mark incomplete" : "Mark completed"}
                    aria-label={`Mark step ${index + 1} as ${isDone ? "incomplete" : "completed"}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    ) : (
                      <Circle size={22} className="text-slate-400" />
                    )}
                  </button>

                  <div className="setup-guide-step-info">
                    <div className="setup-guide-step-meta">
                      <span className="setup-guide-step-num">Step {index + 1}</span>
                      <span className="setup-guide-step-dot">·</span>
                      <span className="setup-guide-step-time">{step.recommendedTime}</span>
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>

                <div className="setup-guide-step-bottom">
                  <div className="setup-guide-channel-tag">
                    <Icon size={14} />
                    <span>{step.channel}</span>
                  </div>
                  <button
                    type="button"
                    className="setup-guide-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(step.route);
                      onClose();
                    }}
                  >
                    <span>{isDone ? "Review Setup" : "Start Setup"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

