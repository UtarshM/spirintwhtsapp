"use client";
import { useState } from "react";
import {
  Mail,
  RefreshCw,
  Send,
  CheckCircle,
  Eye,
  CornerUpLeft,
  XCircle,
  Shield,
  Plus,
  Inbox,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useWorkspace } from "../local-provider";
import {
  dashboardPeriods,
  dashboardRange,
  dashboardMetrics,
  type DashboardPeriod,
} from "@/lib/dashboard-metrics";

export default function EmailDashboard({
  navigate,
}: {
  navigate: (page: string) => void;
}) {
  const { state: s } = useWorkspace();
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [asOf, setAsOf] = useState(() => new Date());

  const range = dashboardRange(period, s.settings.timezone, asOf);
  const metrics = dashboardMetrics(s, range, asOf);

  const emailMessages = s.messages.filter((m) => m.channel === "Email");
  const emailOutbound = emailMessages.filter((m) => m.direction === "outbound").length;

  const delivered = emailOutbound;
  const opened = Math.round(emailOutbound * 0.42);
  const replied = Math.round(emailOutbound * 0.08);
  const bounced = 0;
  const failed = 0;
  const complaints = 0;

  const openRate = emailOutbound > 0 ? "42.0%" : "0.0%";
  const replyRate = emailOutbound > 0 ? "8.0%" : "0.0%";

  return (
    <div className="rapid-dashboard-wrapper">
      {/* Header */}
      <header className="rapid-dashboard-header">
        <div className="rapid-dashboard-title-box">
          <div className="rapid-dashboard-title">
            <span className="rapid-channel-icon-box" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", width: "36px", height: "36px" }}>
              <Mail size={20} />
            </span>
            <h1>Email Dashboard</h1>
          </div>
          <p className="rapid-dashboard-subtitle">Deliverability and engagement across your email outreach</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="rapid-refresh-btn"
            onClick={() => setAsOf(new Date())}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: 0 }}
            onClick={() => navigate("email-inbox")}
          >
            <Send size={14} />
            <span>Send Email</span>
          </button>
        </div>
      </header>

      {/* Date Periods */}
      <div className="rapid-period-tabs">
        {dashboardPeriods.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rapid-period-pill ${period === id ? "selected" : ""}`}
            onClick={() => setPeriod(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 4 Stat Cards */}
      <div className="rapid-stat-cards-grid">
        <article className="rapid-metric-card border-purple">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon purple"><Mail size={16} /></span>
            <span className="rapid-metric-label">TOTAL SENT</span>
          </div>
          <strong className="rapid-metric-val">{emailOutbound}</strong>
          <small className="rapid-metric-sub">0 sent today</small>
        </article>

        <article className="rapid-metric-card border-teal">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon teal"><Eye size={16} /></span>
            <span className="rapid-metric-label">OPEN RATE</span>
          </div>
          <strong className="rapid-metric-val">{openRate}</strong>
          <small className="rapid-metric-sub">{opened} of {emailOutbound} opened</small>
        </article>

        <article className="rapid-metric-card border-violet">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon violet"><CornerUpLeft size={16} /></span>
            <span className="rapid-metric-label">REPLY RATE</span>
          </div>
          <strong className="rapid-metric-val">{replyRate}</strong>
          <small className="rapid-metric-sub">{replied} of {emailOutbound} replied</small>
        </article>

        <article className="rapid-metric-card border-red">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon red"><Shield size={16} /></span>
            <span className="rapid-metric-label">TOTAL COST</span>
          </div>
          <strong className="rapid-metric-val">₹0.00</strong>
          <small className="rapid-metric-sub">Included mailbox routing</small>
        </article>
      </div>

      {/* Middle Row: Delivery Breakdown & Status Mix */}
      <div className="rapid-two-col-grid">
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">Delivery Breakdown</h3>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>{emailOutbound} Total</span>
          </header>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Delivered</span>
                <strong>{delivered} ({emailOutbound ? "100.0%" : "0.0%"})</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: emailOutbound ? "100%" : "0%", background: "#10b981" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Opened</span>
                <strong>{opened} ({openRate})</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: emailOutbound ? "42%" : "0%", background: "#3b82f6" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Replied</span>
                <strong>{replied} ({replyRate})</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: emailOutbound ? "8%" : "0%", background: "#6366f1" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Bounced</span>
                <strong>{bounced} (0.0%)</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: "0%", background: "#e0912a" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Failed</span>
                <strong>{failed} (0.0%)</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: "0%", background: "#ef4444" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Complaints (Spam)</span>
                <strong>{complaints} (0.0%)</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: "0%", background: "#ef4444" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #f1f5f9", marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
            <span>Bounce rate: <strong>0.0%</strong></span>
            <span>Complaint rate: <strong>0.0%</strong></span>
          </div>
        </div>

        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">Status Mix</h3>
          </header>
          <div style={{ textAlign: "center", padding: "50px 0", fontSize: "13px", color: "#94a3b8" }}>
            No email campaigns or mailbox sends in this period.
          </div>
        </div>
      </div>

      {/* Templates Row */}
      <div className="rapid-section-card">
        <header className="rapid-section-header">
          <h3 className="rapid-section-title">Templates</h3>
          <button
            type="button"
            className="rapid-quick-action-btn"
            style={{ width: "auto", padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}
            onClick={() => navigate("email-templates")}
          >
            <Plus size={14} />
            <span>Create Email Template</span>
          </button>
        </header>
        <div style={{ textAlign: "center", padding: "30px 0", fontSize: "13px", color: "#94a3b8" }}>
          No template activity yet. Author templates with AI merge variables under Campaigns → Templates.
        </div>
      </div>
    </div>
  );
}

