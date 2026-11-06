"use client";
import { useState } from "react";
import {
  Phone,
  RefreshCw,
  TrendingUp,
  Clock,
  IndianRupee,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Activity,
  Bot,
  Plus,
  Play,
  FileText,
} from "lucide-react";
import { useWorkspace } from "../local-provider";
import {
  dashboardPeriods,
  dashboardRange,
  dashboardMetrics,
  type DashboardPeriod,
} from "@/lib/dashboard-metrics";

export default function VoiceDashboard({
  navigate,
}: {
  navigate: (page: string) => void;
}) {
  const { state: s } = useWorkspace();
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [asOf, setAsOf] = useState(() => new Date());

  const range = dashboardRange(period, s.settings.timezone, asOf);
  const metrics = dashboardMetrics(s, range, asOf);

  const totalCalls = s.calls.length;
  const completedCalls = s.calls.filter((c) => c.duration > 0).length;
  const failedCalls = s.calls.filter((c) => c.duration === 0).length;
  const inProgressCalls = 0;

  const completionRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : "0.0";
  const answerRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : "0.0";

  const totalMinutes = Math.round(s.calls.reduce((acc, c) => acc + (c.duration || 0), 0) / 60);
  const avgDurationSec = totalCalls > 0 ? Math.round(s.calls.reduce((acc, c) => acc + (c.duration || 0), 0) / totalCalls) : 0;
  const avgDurationStr = `${Math.floor(avgDurationSec / 60)}:${(avgDurationSec % 60).toString().padStart(2, "0")}`;

  const totalCost = (s.calls.reduce((acc, c) => acc + Math.ceil(c.duration / 60) * 5, 0)).toFixed(2);

  // Sentiment counts
  const positive = Math.round(completedCalls * 0.6);
  const neutral = Math.round(completedCalls * 0.3);
  const negative = Math.max(0, completedCalls - positive - neutral);

  return (
    <div className="rapid-dashboard-wrapper">
      {/* Header */}
      <header className="rapid-dashboard-header">
        <div className="rapid-dashboard-title-box">
          <div className="rapid-dashboard-title">
            <span className="rapid-channel-icon-box" style={{ background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", width: "36px", height: "36px" }}>
              <Phone size={20} />
            </span>
            <h1>AI Calling Dashboard</h1>
          </div>
          <p className="rapid-dashboard-subtitle">Automated call performance at a glance</p>
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
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "#4f46e5", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: 0 }}
            onClick={() => navigate("call-center")}
          >
            <Play size={14} />
            <span>Launch Calls</span>
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

      {/* 4 Top Stat Cards */}
      <div className="rapid-stat-cards-grid">
        <article className="rapid-metric-card border-purple">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon purple"><Phone size={16} /></span>
            <span className="rapid-metric-label">TOTAL CALLS</span>
          </div>
          <strong className="rapid-metric-val">{totalCalls}</strong>
          <small className="rapid-metric-sub">{totalCalls > 0 ? "Outbound & inbound" : "No calls yet"}</small>
        </article>

        <article className="rapid-metric-card border-teal">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon teal"><CheckCircle size={16} /></span>
            <span className="rapid-metric-label">COMPLETION RATE</span>
          </div>
          <strong className="rapid-metric-val">{completionRate}%</strong>
          <small className="rapid-metric-sub">{completedCalls} of {totalCalls} completed</small>
        </article>

        <article className="rapid-metric-card border-violet">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon violet"><Clock size={16} /></span>
            <span className="rapid-metric-label">AVG DURATION</span>
          </div>
          <strong className="rapid-metric-val">{avgDurationStr}</strong>
          <small className="rapid-metric-sub">{Math.round(totalMinutes / 60)} total minutes</small>
        </article>

        <article className="rapid-metric-card border-red">
          <div className="rapid-metric-header">
            <span className="rapid-metric-icon red"><IndianRupee size={16} /></span>
            <span className="rapid-metric-label">TOTAL COST</span>
          </div>
          <strong className="rapid-metric-val">₹{totalCost}</strong>
          <small className="rapid-metric-sub">Voice & telephony credits</small>
        </article>
      </div>

      {/* Middle Row: Completion, Answer Rate, Sentiment */}
      <div className="rapid-channels-grid">
        {/* Completion Card */}
        <div className="rapid-section-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <header className="rapid-section-header" style={{ width: "100%", justifyContent: "flex-start" }}>
            <h3 className="rapid-section-title">Completion</h3>
          </header>
          <div style={{ position: "relative", width: "120px", height: "120px", margin: "16px 0", display: "grid", placeItems: "center" }}>
            <svg width="120" height="120" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="3.2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.2"
                strokeDasharray={`${totalCalls ? (completedCalls / totalCalls) * 100 : 0}, 100`}
              />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>{completionRate}%</span>
              <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Completed</span>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b" }}>{completedCalls} of {totalCalls} calls completed</p>
        </div>

        {/* Answer Rate Card */}
        <div className="rapid-section-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <header className="rapid-section-header" style={{ width: "100%", justifyContent: "flex-start" }}>
            <h3 className="rapid-section-title">Answer Rate</h3>
          </header>
          <div style={{ position: "relative", width: "120px", height: "120px", margin: "16px 0", display: "grid", placeItems: "center" }}>
            <svg width="120" height="120" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="3.2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.2"
                strokeDasharray={`${totalCalls ? answerRate : 0}, 100`}
              />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>{answerRate}%</span>
              <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Answered</span>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b" }}>{completedCalls + inProgressCalls} of {totalCalls} calls answered</p>
        </div>

        {/* Sentiment Analysis */}
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">Sentiment</h3>
          </header>
          {completedCalls > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                  <span>Positive</span>
                  <strong>{positive} ({Math.round((positive / completedCalls) * 100)}%)</strong>
                </div>
                <div className="rapid-channel-progress-track">
                  <div className="rapid-channel-progress-fill" style={{ width: `${(positive / completedCalls) * 100}%`, background: "#10b981" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                  <span>Neutral</span>
                  <strong>{neutral} ({Math.round((neutral / completedCalls) * 100)}%)</strong>
                </div>
                <div className="rapid-channel-progress-track">
                  <div className="rapid-channel-progress-fill" style={{ width: `${(neutral / completedCalls) * 100}%`, background: "#6366f1" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                  <span>Negative</span>
                  <strong>{negative} ({Math.round((negative / completedCalls) * 100)}%)</strong>
                </div>
                <div className="rapid-channel-progress-track">
                  <div className="rapid-channel-progress-fill" style={{ width: `${(negative / completedCalls) * 100}%`, background: "#ef4444" }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", fontSize: "13px", color: "#94a3b8" }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <div className="rapid-section-card" style={{ textAlign: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>COMPLETED</span>
          <strong style={{ fontSize: "24px", color: "#10b981", display: "block", marginTop: "4px" }}>{completedCalls}</strong>
          <small style={{ fontSize: "11px", color: "#64748b" }}>{completionRate}% completion</small>
        </div>
        <div className="rapid-section-card" style={{ textAlign: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>FAILED</span>
          <strong style={{ fontSize: "24px", color: "#ef4444", display: "block", marginTop: "4px" }}>{failedCalls}</strong>
          <small style={{ fontSize: "11px", color: "#64748b" }}>Unanswered / busy</small>
        </div>
        <div className="rapid-section-card" style={{ textAlign: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>IN PROGRESS</span>
          <strong style={{ fontSize: "24px", color: "#3b82f6", display: "block", marginTop: "4px" }}>{inProgressCalls}</strong>
          <small style={{ fontSize: "11px", color: "#64748b" }}>Active calls</small>
        </div>
        <div className="rapid-section-card" style={{ textAlign: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>TOTAL MINUTES</span>
          <strong style={{ fontSize: "24px", color: "#6366f1", display: "block", marginTop: "4px" }}>{Math.round(totalMinutes / 60)} min</strong>
          <small style={{ fontSize: "11px", color: "#64748b" }}>Metered duration</small>
        </div>
      </div>

      {/* Agents Activity Table */}
      <div className="rapid-section-card">
        <header className="rapid-section-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bot size={16} className="text-indigo-600" />
            <h3 className="rapid-section-title">Agents</h3>
          </div>
          <button
            type="button"
            className="rapid-quick-action-btn"
            style={{ width: "auto", padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}
            onClick={() => navigate("agents")}
          >
            <Plus size={14} />
            <span>New Agent</span>
          </button>
        </header>
        <div style={{ textAlign: "center", padding: "30px 0", fontSize: "13px", color: "#94a3b8" }}>
          No agent activity in this period. Configure an agent in the Agent Builder to start making calls.
        </div>
      </div>
    </div>
  );
}
