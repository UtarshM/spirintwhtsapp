"use client";
import { Sparkles, X, Phone, MessageSquare, Mail, Cpu, CheckCircle } from "lucide-react";

export default function AiUsageModal({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  if (!isOpen) return null;

  const usageStats = [
    {
      channel: "AI Calling (Minutes)",
      icon: Phone,
      used: 18,
      limit: 120,
      unit: "mins",
      color: "orange",
    },
    {
      channel: "WhatsApp Business API",
      icon: MessageSquare,
      used: 0,
      limit: 1000,
      unit: "convs / day",
      color: "emerald",
    },
    {
      channel: "Cold Email Outreach",
      icon: Mail,
      used: 0,
      limit: 2000,
      unit: "emails / day",
      color: "blue",
    },
    {
      channel: "AI Copilot & LLM Tokens",
      icon: Cpu,
      used: 35000,
      limit: 500000,
      unit: "tokens",
      color: "purple",
    },
  ];

  return (
    <div className="ai-usage-overlay" onClick={onClose} role="presentation">
      <div
        className="ai-usage-modal"
        role="dialog"
        aria-label="AI Usage & Channel Limits"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ai-usage-header">
          <div className="ai-usage-header-icon">
            <Sparkles size={20} className="text-purple-600" />
          </div>
          <div>
            <h3>AI Usage & Tier Limits</h3>
            <p>Active allocation and capacity across your outreach channels</p>
          </div>
          <button
            className="ai-usage-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ai-usage-body">
          <div className="ai-usage-plan-badge">
            <CheckCircle size={15} className="text-emerald-500" />
            <span>Scale Plan · Concurrency Tier 1</span>
          </div>

          <div className="ai-usage-metrics-grid">
            {usageStats.map((stat) => {
              const Icon = stat.icon;
              const pct = Math.min(100, Math.round((stat.used / stat.limit) * 100));
              return (
                <div key={stat.channel} className="ai-usage-card">
                  <div className="ai-usage-card-top">
                    <div className={`ai-usage-card-icon ${stat.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="ai-usage-card-title">{stat.channel}</span>
                  </div>

                  <div className="ai-usage-card-val">
                    <strong>{stat.used.toLocaleString()}</strong>
                    <span>/ {stat.limit.toLocaleString()} {stat.unit}</span>
                  </div>

                  <div className="ai-usage-track">
                    <div
                      className={`ai-usage-fill ${stat.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <small className="ai-usage-pct">{pct}% of monthly tier</small>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="ai-usage-footer">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onClose();
              onNavigate("billing");
            }}
          >
            Manage Billing & Tiers
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onClose();
              onNavigate("billing");
            }}
          >
            <Sparkles size={15} />
            Request Higher Limits
          </button>
        </footer>
      </div>
    </div>
  );
}

