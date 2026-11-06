"use client";
import { useState } from "react";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  Users,
  CornerUpLeft,
  Mail,
  Phone,
  MessageSquare,
  IndianRupee,
  Calendar,
  Inbox,
  Megaphone,
  CheckCircle,
  Zap,
  Shield,
  Gauge,
  Clock,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { useWorkspace } from "../local-provider";
import { balance } from "@/lib/local-workspace";
import {
  dashboardPeriods,
  dashboardRange,
  dashboardMetrics,
  type DashboardPeriod,
} from "@/lib/dashboard-metrics";

export default function Overview({
  navigate,
  onOpenRecharge,
}: {
  navigate: (page: string) => void;
  onOpenRecharge?: () => void;
}) {
  const { state: s } = useWorkspace();
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [asOf, setAsOf] = useState(() => new Date());

  const range = dashboardRange(
    period,
    s.settings.timezone,
    asOf,
    from,
    through,
  );
  const metrics = dashboardMetrics(s, range, asOf);
  const max = Math.max(1, ...metrics.days.map((d) => d.credits));

  // Channel metrics
  const emailOutbound =
    metrics.channelMetrics.find((c) => c.channel === "Email")?.outbound || 0;
  const waOutbound =
    metrics.channelMetrics.find((c) => c.channel === "WhatsApp")?.outbound || 0;
  const callsOutbound =
    metrics.channelMetrics.find((c) => c.channel === "AI calling")?.outbound || 0;

  // Real or simulated counts
  const totalContacts = s.contacts.length;
  const consentedContacts = s.contacts.filter((c) => c.consent && !c.optedOut).length;

  const emailDelivered = emailOutbound;
  const emailOpened = Math.round(emailOutbound * 0.42);
  const emailReplied = Math.round(emailOutbound * 0.08);

  const waDelivered = waOutbound;
  const waRead = Math.round(waOutbound * 0.74);
  const waReplied = Math.round(waOutbound * 0.18);

  const callsCompleted = callsOutbound;

  const totalSpend = `₹${metrics.usage.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const walletBalance = `₹${balance(s).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div className="rapid-dashboard-wrapper">
      {/* 0. Header */}
      <header className="rapid-dashboard-header">
        <div className="rapid-dashboard-title-box">
          <div className="rapid-dashboard-title">
            <span className="rapid-dashboard-icon-badge">
              <BarChart3 size={24} className="text-orange-500" />
            </span>
            <h1>Dashboard</h1>
          </div>
          <p className="rapid-dashboard-subtitle">Your outreach at a glance</p>
        </div>

        <div className="rapid-dashboard-actions">
          <button
            type="button"
            className="rapid-refresh-btn"
            title="Recalculate metrics from workspace"
            onClick={() => setAsOf(new Date())}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* 1. Time Period Filter Pills */}
      <div className="rapid-period-tabs" role="group" aria-label="Dashboard date period">
        {dashboardPeriods.map(([id, label]) => {
          const isSelected = period === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isSelected}
              className={`rapid-period-pill ${isSelected ? "selected" : ""}`}
              onClick={() => setPeriod(id)}
            >
              {id === "custom" && <Calendar size={13} className="mr-1 inline-block" />}
              {label}
            </button>
          );
        })}
      </div>

      {period === "custom" && (
        <div className="rapid-custom-dates">
          <label>
            <span>From:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            <span>Through:</span>
            <input
              type="date"
              min={from}
              value={through}
              onChange={(e) => setThrough(e.target.value)}
            />
          </label>
        </div>
      )}

      {range.error && (
        <div role="alert" className="rapid-range-error">
          {range.error}
        </div>
      )}

      {/* 2. Top 4 Metric Cards */}
      <div className="rapid-stat-cards-grid">
        {/* Card 1: CREDITS */}
        <article
          className="rapid-metric-card border-purple cursor-pointer"
          onClick={onOpenRecharge}
          title="Click to recharge wallet credits"
        >
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon purple">
              <IndianRupee size={16} />
            </span>
            <span className="rapid-metric-label">CREDITS</span>
          </div>
          <strong className="rapid-metric-val">{walletBalance}</strong>
          <small className="rapid-metric-sub">Wallet balance</small>
        </article>

        {/* Card 2: TOTAL COST */}
        <article className="rapid-metric-card border-red">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon red">
              <TrendingUp size={16} />
            </span>
            <span className="rapid-metric-label">TOTAL COST</span>
          </div>
          <strong className="rapid-metric-val">{totalSpend}</strong>
          <small className="rapid-metric-sub">&nbsp;</small>
        </article>

        {/* Card 3: TOTAL CONTACTS */}
        <article
          className="rapid-metric-card border-teal cursor-pointer"
          onClick={() => navigate("contacts")}
          title="Click to manage contacts"
        >
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon teal">
              <Users size={16} />
            </span>
            <span className="rapid-metric-label">TOTAL CONTACTS</span>
          </div>
          <strong className="rapid-metric-val">{totalContacts.toLocaleString()}</strong>
          <small className="rapid-metric-sub">
            {totalContacts > 0 ? `${consentedContacts} with consent` : "\u00A0"}
          </small>
        </article>

        {/* Card 4: REPLY RATE */}
        <article className="rapid-metric-card border-violet">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon violet">
              <CornerUpLeft size={16} />
            </span>
            <span className="rapid-metric-label">REPLY RATE</span>
          </div>
          <strong className="rapid-metric-val">{metrics.replyRate.toFixed(1)}%</strong>
          <small className="rapid-metric-sub">
            {metrics.replied} of {metrics.contacted}
          </small>
        </article>
      </div>

      {/* 3. Daily Spend */}
      <section className="rapid-daily-spend-card">
        <header className="rapid-daily-spend-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={18} className="text-orange-500" />
            <h2>Daily Spend</h2>
          </div>
          <strong className="rapid-daily-spend-val">{totalSpend}</strong>
        </header>

        <div className="rapid-daily-spend-content">
          {metrics.days.some((d) => d.credits > 0) ? (
            <div
              className="rapid-spend-chart"
              role="img"
              aria-label={metrics.days
                .map((d) => `${d.key}: ₹${d.credits}`)
                .join("; ")}
            >
              {metrics.days.map((d) => (
                <div key={d.key} className="rapid-spend-col">
                  <strong className="rapid-spend-col-val">₹{d.credits}</strong>
                  <div className="rapid-spend-track">
                    <span
                      style={{
                        height: `${Math.max(8, (d.credits / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <small className="rapid-spend-day">{d.key.slice(5)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="rapid-spend-empty">
              <div className="rapid-empty-box-icon">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 14L24 4L42 14V34L24 44L6 34V14Z" />
                  <path d="M6 14L24 24L42 14" />
                  <path d="M24 24V44" />
                </svg>
              </div>
              <p>No spend in this period</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Tri-Channel Performance Cards */}
      <div className="rapid-channels-grid">
        {/* Email */}
        <article
          className="rapid-channel-card cursor-pointer"
          onClick={() => navigate("email-overview")}
        >
          <header className="rapid-channel-card-header">
            <div className="rapid-channel-title">
              <span
                className="rapid-channel-icon-box"
                style={{ backgroundColor: "rgba(42, 120, 214, 0.08)", color: "#2a78d6" }}
              >
                <Mail size={16} />
              </span>
              <strong>Email</strong>
            </div>
            <span className="rapid-channel-count">{emailOutbound} sent</span>
          </header>
          <div className="rapid-channel-card-body">
            {/* Delivered */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot green" />
                  Delivered
                </span>
                <span>
                  {emailDelivered} ({emailOutbound ? Math.round((emailDelivered / emailOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: emailOutbound ? `${(emailDelivered / emailOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #1baf7a 0%, #64c9a5 100%)",
                  }}
                />
              </div>
            </div>

            {/* Opened */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#2a78d6" }} />
                  Opened
                </span>
                <span>
                  {emailOpened} ({emailOutbound ? Math.round((emailOpened / emailOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: emailOutbound ? `${(emailOpened / emailOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #2a78d6 0%, #6ea3e3 100%)",
                  }}
                />
              </div>
            </div>

            {/* Replied */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#6d5ed6" }} />
                  Replied
                </span>
                <span>
                  {emailReplied} ({emailOutbound ? Math.round((emailReplied / emailOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: emailOutbound ? `${(emailReplied / emailOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #6d5ed6 0%, #9c92e3 100%)",
                  }}
                />
              </div>
            </div>

            {/* Bounced */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#e0912a" }} />
                  Bounced
                </span>
                <span>0 (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: "0%",
                    backgroundImage: "linear-gradient(90deg, #e0912a 0%, #eab46e 100%)",
                  }}
                />
              </div>
            </div>

            <div className="rapid-channel-footer-stats">
              <span>Cost</span>
              <strong>₹0.00</strong>
            </div>
            <p className="rapid-channel-subtext danger">Complaints (spam): 0</p>
          </div>
        </article>

        {/* WhatsApp */}
        <article
          className="rapid-channel-card cursor-pointer"
          onClick={() => navigate("wa-overview")}
        >
          <header className="rapid-channel-card-header">
            <div className="rapid-channel-title">
              <span
                className="rapid-channel-icon-box"
                style={{ backgroundColor: "rgba(27, 175, 122, 0.08)", color: "#1baf7a" }}
              >
                <MessageSquare size={16} />
              </span>
              <strong>WhatsApp</strong>
            </div>
            <span className="rapid-channel-count">{waOutbound} sent</span>
          </header>
          <div className="rapid-channel-card-body">
            {/* Delivered */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot green" />
                  Delivered
                </span>
                <span>
                  {waDelivered} ({waOutbound ? Math.round((waDelivered / waOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: waOutbound ? `${(waDelivered / waOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #1baf7a 0%, #64c9a5 100%)",
                  }}
                />
              </div>
            </div>

            {/* Read */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#1c9dbb" }} />
                  Read
                </span>
                <span>
                  {waRead} ({waOutbound ? Math.round((waRead / waOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: waOutbound ? `${(waRead / waOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #1c9dbb 0%, #65bcd1 100%)",
                  }}
                />
              </div>
            </div>

            {/* Replied */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#6d5ed6" }} />
                  Replied
                </span>
                <span>
                  {waReplied} ({waOutbound ? Math.round((waReplied / waOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: waOutbound ? `${(waReplied / waOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #6d5ed6 0%, #9c92e3 100%)",
                  }}
                />
              </div>
            </div>

            {/* Failed */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#d03b3b" }} />
                  Failed
                </span>
                <span>0 (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: "0%",
                    backgroundImage: "linear-gradient(90deg, #d03b3b 0%, #df7a7a 100%)",
                  }}
                />
              </div>
            </div>

            <div className="rapid-channel-footer-stats">
              <span>Cost</span>
              <strong>₹0.00</strong>
            </div>
            <p className="rapid-channel-subtext warning" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Zap size={12} />
              Auto-replies: 0 · ₹0.00
            </p>
            <p className="rapid-channel-subtext">Spam rate limit: 0</p>
          </div>
        </article>

        {/* AI Calling */}
        <article
          className="rapid-channel-card cursor-pointer"
          onClick={() => navigate("voice-overview")}
        >
          <header className="rapid-channel-card-header">
            <div className="rapid-channel-title">
              <span
                className="rapid-channel-icon-box"
                style={{ backgroundColor: "rgba(235, 104, 52, 0.08)", color: "#eb6834" }}
              >
                <Phone size={16} />
              </span>
              <strong>AI Calling</strong>
            </div>
            <span className="rapid-channel-count">{callsOutbound} calls</span>
          </header>
          <div className="rapid-channel-card-body">
            {/* Completed */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot green" />
                  Completed
                </span>
                <span>
                  {callsCompleted} ({callsOutbound ? Math.round((callsCompleted / callsOutbound) * 100) : 0}%)
                </span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: callsOutbound ? `${(callsCompleted / callsOutbound) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #1baf7a 0%, #64c9a5 100%)",
                  }}
                />
              </div>
            </div>

            {/* Failed */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#d03b3b" }} />
                  Failed
                </span>
                <span>0 (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: "0%",
                    backgroundImage: "linear-gradient(90deg, #d03b3b 0%, #df7a7a 100%)",
                  }}
                />
              </div>
            </div>

            <div className="rapid-channel-footer-stats">
              <span>Cost</span>
              <strong>₹0.00</strong>
            </div>
            <p className="rapid-channel-subtext">Avg duration: 0:00</p>
          </div>
        </article>
      </div>

      {/* 5. Email Deliverability & Automation Number */}
      <div className="rapid-two-col-grid">
        {/* Email Deliverability */}
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">
              <Mail size={16} className="text-blue-500" />
              Email Deliverability
            </h3>
          </header>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div className="rapid-stat-box">
              <div className="rapid-stat-box-val" style={{ color: "#059669" }}>
                {emailOutbound ? "100.0%" : "0.0%"}
              </div>
              <div className="rapid-stat-box-label">
                Delivered · {emailDelivered} of {emailOutbound}
              </div>
            </div>
            <div className="rapid-stat-box">
              <div className="rapid-stat-box-val" style={{ color: "#2563eb" }}>
                {emailOutbound ? "42.0%" : "0.0%"}
              </div>
              <div className="rapid-stat-box-label">
                Open rate · {emailOpened} opened
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div className="rapid-stat-box danger">
              <div className="rapid-stat-box-val" style={{ color: "#dc2626" }}>0</div>
              <div className="rapid-stat-box-label" style={{ color: "#ef4444" }}>Bounced · 0.0%</div>
            </div>
            <div className="rapid-stat-box danger">
              <div className="rapid-stat-box-val" style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield size={14} />0
              </div>
              <div className="rapid-stat-box-label" style={{ color: "#ef4444" }}>Spam · 0.0%</div>
            </div>
            <div className="rapid-stat-box">
              <div className="rapid-stat-box-val" style={{ color: "#334155" }}>0</div>
              <div className="rapid-stat-box-label">Failed</div>
            </div>
          </div>
        </div>

        {/* Automation Number */}
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">
              <GitBranch size={16} style={{ color: "#1baf7a" }} />
              Automation Number
            </h3>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#475569" }}>₹0.00</span>
          </header>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            <div className="rapid-stat-box" style={{ textAlign: "center" }}>
              <div className="rapid-stat-box-val" style={{ color: "#1e293b" }}>0</div>
              <div className="rapid-stat-box-label">Sent</div>
            </div>
            <div className="rapid-stat-box" style={{ textAlign: "center" }}>
              <div className="rapid-stat-box-val" style={{ color: "#1e293b" }}>0</div>
              <div className="rapid-stat-box-label">Delivered</div>
            </div>
            <div className="rapid-stat-box" style={{ textAlign: "center" }}>
              <div className="rapid-stat-box-val" style={{ color: "#1e293b" }}>0</div>
              <div className="rapid-stat-box-label">Read</div>
            </div>
            <div className="rapid-stat-box" style={{ textAlign: "center" }}>
              <div className="rapid-stat-box-val" style={{ color: "#1e293b" }}>0</div>
              <div className="rapid-stat-box-label">Failed</div>
            </div>
          </div>
          <div style={{ paddingTop: "14px", marginTop: "16px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#64748b" }}>
            Engine sends: <strong style={{ color: "#334155" }}>0</strong> · ₹0.00
          </div>
        </div>
      </div>

      {/* 6. Campaigns, Leads Funnel, WhatsApp Tier */}
      <div className="rapid-four-col-grid">
        {/* Campaigns */}
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">
              <Megaphone size={16} className="text-orange-500" />
              Campaigns
            </h3>
          </header>
          {s.campaigns.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {s.campaigns.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate("campaigns")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ color: "#1e293b" }}>{c.name}</strong>
                  <span style={{ color: "#64748b" }}>{c.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", fontSize: "13px", color: "#64748b" }}>
              No data yet
            </div>
          )}
        </div>

        {/* Leads Funnel */}
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">
              <TrendingUp size={16} style={{ color: "#0e9aa7" }} />
              Leads Funnel
            </h3>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>{totalContacts}</span>
          </header>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Total Leads */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#6d5ed6" }} />
                  Total Leads
                </span>
                <span>{totalContacts} (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: totalContacts > 0 ? "100%" : "0%",
                    backgroundImage: "linear-gradient(90deg, #6d5ed6 0%, #9c92e3 100%)",
                  }}
                />
              </div>
            </div>

            {/* Landed */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#2a78d6" }} />
                  Landed
                </span>
                <span>0 (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: "0%",
                    backgroundImage: "linear-gradient(90deg, #2a78d6 0%, #6ea3e3 100%)",
                  }}
                />
              </div>
            </div>

            {/* Enrolled */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#0e9aa7" }} />
                  Enrolled
                </span>
                <span>0 (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: "0%",
                    backgroundImage: "linear-gradient(90deg, #0e9aa7 0%, #5bbaa3 100%)",
                  }}
                />
              </div>
            </div>

            {/* Replied */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot" style={{ backgroundColor: "#eb6834" }} />
                  Replied
                </span>
                <span>{metrics.replied} ({metrics.contacted ? Math.round((metrics.replied / metrics.contacted) * 100) : 0}%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: metrics.contacted ? `${(metrics.replied / metrics.contacted) * 100}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #eb6834 0%, #f19875 100%)",
                  }}
                />
              </div>
            </div>

            {/* Completed */}
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="rapid-status-dot green" />
                  Completed
                </span>
                <span>0 (0%)</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div
                  className="rapid-channel-progress-fill"
                  style={{
                    width: "0%",
                    backgroundImage: "linear-gradient(90deg, #1baf7a 0%, #64c9a5 100%)",
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "14px", marginTop: "14px", borderTop: "1px solid #f1f5f9", fontSize: "11px" }}>
            <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "9999px", fontWeight: "600" }}>
              Meta 0
            </span>
            <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: "9999px", fontWeight: "600" }}>
              Sheet 0
            </span>
            <span style={{ marginLeft: "auto", color: "#64748b" }}>Duplicate 0 · Failed 0</span>
          </div>
        </div>

        {/* WhatsApp Tier */}
        <div className="rapid-section-card" style={{ display: "flex", flexDirection: "column" }}>
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">
              <span className="rapid-channel-icon-box" style={{ width: "28px", height: "28px", background: "rgba(27, 175, 122, 0.08)", color: "#1baf7a" }}>
                <Shield size={14} />
              </span>
              WhatsApp Tier
            </h3>
          </header>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
            WhatsApp tier unavailable
          </p>
        </div>
      </div>

      {/* 7. TODAY'S USAGE & Quick Actions */}
      <div>
        <h2 style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Gauge size={16} />
          Today&apos;s Usage
        </h2>
        <div className="rapid-five-col-grid">
          {/* Email Daily Usage */}
          <div className="rapid-section-card">
            <header className="rapid-section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="rapid-channel-icon-box" style={{ width: "30px", height: "30px", background: "rgba(42, 120, 214, 0.08)", color: "#2a78d6" }}>
                  <Mail size={15} />
                </span>
                <strong style={{ fontSize: "14px", color: "#1e293b" }}>Email Daily Usage</strong>
              </div>
              <span className="rapid-badge-available">
                <i />
                Available
              </span>
            </header>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "12px" }}>
              <span style={{ fontSize: "30px", fontWeight: "700", color: "#0f172a" }}>50</span>
              <span style={{ fontSize: "13px", color: "#64748b" }}>/ 50 remaining</span>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                <span>0 sent today</span>
                <span>0% used</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: "0%", background: "#2a78d6" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#64748b" }}>
              <span>All senders</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span><strong style={{ color: "#0f172a" }}>0</strong> used</span>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <span><strong style={{ color: "#0f172a" }}>50</strong> left</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94a3b8" }}>
                  <Clock size={12} />
                  15s delay
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Daily Usage */}
          <div className="rapid-section-card">
            <header className="rapid-section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="rapid-channel-icon-box" style={{ width: "30px", height: "30px", background: "rgba(27, 175, 122, 0.08)", color: "#1baf7a" }}>
                  <MessageSquare size={15} />
                </span>
                <strong style={{ fontSize: "14px", color: "#1e293b" }}>WhatsApp Daily Usage</strong>
              </div>
              <span className="rapid-badge-available">
                <i />
                Available
              </span>
            </header>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "12px" }}>
              <span style={{ fontSize: "30px", fontWeight: "700", color: "#0f172a" }}>250</span>
              <span style={{ fontSize: "13px", color: "#64748b" }}>/ 250 remaining</span>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                <span>0 sent today</span>
                <span>0% used</span>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: "0%", background: "#1baf7a" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
              <div>
                <strong style={{ fontSize: "18px", color: "#0f172a", display: "block" }}>250</strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Total Limit</span>
              </div>
              <div>
                <strong style={{ fontSize: "18px", color: "#0f172a", display: "block" }}>0</strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Used Today</span>
              </div>
              <div>
                <strong style={{ fontSize: "18px", color: "#0f172a", display: "block" }}>250</strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Remaining</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rapid-section-card">
            <header className="rapid-section-header" style={{ marginBottom: "10px" }}>
              <h3 className="rapid-section-title">Quick Actions</h3>
            </header>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                type="button"
                className="rapid-quick-action-btn"
                onClick={() => navigate("campaigns")}
              >
                <span className="rapid-quick-action-icon">
                  <Megaphone size={15} />
                </span>
                <span>New Campaign</span>
                <ChevronRight size={14} className="rapid-quick-action-arrow" />
              </button>
              <button
                type="button"
                className="rapid-quick-action-btn"
                onClick={() => navigate("contacts")}
              >
                <span className="rapid-quick-action-icon">
                  <Users size={15} />
                </span>
                <span>Import Contacts</span>
                <ChevronRight size={14} className="rapid-quick-action-arrow" />
              </button>
              <button
                type="button"
                className="rapid-quick-action-btn"
                onClick={() => navigate("email-inbox")}
              >
                <span className="rapid-quick-action-icon">
                  <Mail size={15} />
                </span>
                <span>Email Inbox</span>
                <ChevronRight size={14} className="rapid-quick-action-arrow" />
              </button>
              <button
                type="button"
                className="rapid-quick-action-btn"
                onClick={() => navigate("wa-inbox")}
              >
                <span className="rapid-quick-action-icon">
                  <MessageSquare size={15} />
                </span>
                <span>WhatsApp Inbox</span>
                <ChevronRight size={14} className="rapid-quick-action-arrow" />
              </button>
              <button
                type="button"
                className="rapid-quick-action-btn"
                onClick={() => navigate("qualified")}
              >
                <span className="rapid-quick-action-icon">
                  <Phone size={15} />
                </span>
                <span>Lead List</span>
                <ChevronRight size={14} className="rapid-quick-action-arrow" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
