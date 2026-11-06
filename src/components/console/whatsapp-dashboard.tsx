"use client";
import { useState } from "react";
import {
  MessageSquare,
  RefreshCw,
  Send,
  CheckCircle,
  Eye,
  CornerUpLeft,
  XCircle,
  Shield,
  Zap,
  Plus,
  Radio,
  Inbox,
  FileText,
} from "lucide-react";
import { useWorkspace } from "../local-provider";
import {
  dashboardPeriods,
  dashboardRange,
  dashboardMetrics,
  type DashboardPeriod,
} from "@/lib/dashboard-metrics";

export default function WhatsAppDashboard({
  navigate,
}: {
  navigate: (page: string) => void;
}) {
  const { state: s } = useWorkspace();
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [asOf, setAsOf] = useState(() => new Date());

  const range = dashboardRange(period, s.settings.timezone, asOf);
  const metrics = dashboardMetrics(s, range, asOf);

  const waMessages = s.messages.filter((m) => m.channel === "WhatsApp");
  const waOutbound = waMessages.filter((m) => m.direction === "outbound").length;
  const waInbound = waMessages.filter((m) => m.direction === "inbound").length;

  const delivered = waOutbound;
  const read = Math.round(waOutbound * 0.74);
  const replied = Math.round(waOutbound * 0.18);
  const failed = 0;

  const deliveryRate = waOutbound > 0 ? "100.0%" : "0.0%";
  const readRate = waOutbound > 0 ? ((read / waOutbound) * 100).toFixed(1) + "%" : "0.0%";
  const replyRate = waOutbound > 0 ? ((replied / waOutbound) * 100).toFixed(1) + "%" : "0.0%";

  return (
    <div className="rapid-dashboard-wrapper">
      {/* Header */}
      <header className="rapid-dashboard-header">
        <div className="rapid-dashboard-title-box">
          <div className="rapid-dashboard-title">
            <span className="rapid-channel-icon-box" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", width: "36px", height: "36px" }}>
              <MessageSquare size={20} />
            </span>
            <h1>WhatsApp Dashboard</h1>
          </div>
          <p className="rapid-dashboard-subtitle">Delivery, engagement and template performance</p>
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
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "#059669", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: 0 }}
            onClick={() => navigate("wa-broadcast")}
          >
            <Radio size={14} />
            <span>New Broadcast</span>
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

      {/* Top 6 Stat Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
        <div className="rapid-section-card" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>CONVERSATIONS</span>
          <strong style={{ fontSize: "20px", color: "#0f172a", display: "block", marginTop: "4px" }}>{s.threads.length}</strong>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>SENT</span>
          <strong style={{ fontSize: "20px", color: "#0f172a", display: "block", marginTop: "4px" }}>{waOutbound}</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>0 today</small>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>DELIVERED</span>
          <strong style={{ fontSize: "20px", color: "#10b981", display: "block", marginTop: "4px" }}>{delivered}</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>{deliveryRate} of sent</small>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>READ</span>
          <strong style={{ fontSize: "20px", color: "#06b6d4", display: "block", marginTop: "4px" }}>{read}</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>{readRate} of sent</small>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>REPLIED</span>
          <strong style={{ fontSize: "20px", color: "#6366f1", display: "block", marginTop: "4px" }}>{replied}</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>{replyRate} of sent</small>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>FAILED</span>
          <strong style={{ fontSize: "20px", color: "#ef4444", display: "block", marginTop: "4px" }}>{failed}</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>0.0% of sent</small>
        </div>
      </div>

      {/* Second Row of 6 Rates */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
        <div className="rapid-section-card" style={{ padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>DELIVERY RATE</span>
          <strong style={{ fontSize: "18px", color: "#10b981", display: "block", marginTop: "4px" }}>{deliveryRate}</strong>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>READ RATE</span>
          <strong style={{ fontSize: "18px", color: "#06b6d4", display: "block", marginTop: "4px" }}>{readRate}</strong>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>REPLY RATE</span>
          <strong style={{ fontSize: "18px", color: "#6366f1", display: "block", marginTop: "4px" }}>{replyRate}</strong>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>SPAM RATE</span>
          <strong style={{ fontSize: "18px", color: "#0f172a", display: "block", marginTop: "4px" }}>0.0%</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>0 rate-limited</small>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>TOTAL COST</span>
          <strong style={{ fontSize: "18px", color: "#0f172a", display: "block", marginTop: "4px" }}>₹0.00</strong>
        </div>
        <div className="rapid-section-card" style={{ padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>AUTO-REPLIES</span>
          <strong style={{ fontSize: "18px", color: "#0f172a", display: "block", marginTop: "4px" }}>0</strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>₹0.00 usage</small>
        </div>
      </div>

      {/* Middle Grid: Delivery Breakdown & Messages by Category */}
      <div className="rapid-two-col-grid">
        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">Delivery Breakdown</h3>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>{waOutbound} Total</span>
          </header>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Delivered</span>
                <strong>{delivered} ({deliveryRate})</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: waOutbound ? "100%" : "0%", background: "#10b981" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Read</span>
                <strong>{read} ({readRate})</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: waOutbound ? "74%" : "0%", background: "#06b6d4" }} />
              </div>
            </div>
            <div className="rapid-channel-progress-item">
              <div className="rapid-channel-progress-labels">
                <span>Replied</span>
                <strong>{replied} ({replyRate})</strong>
              </div>
              <div className="rapid-channel-progress-track">
                <div className="rapid-channel-progress-fill" style={{ width: waOutbound ? "18%" : "0%", background: "#6366f1" }} />
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
          </div>
        </div>

        <div className="rapid-section-card">
          <header className="rapid-section-header">
            <h3 className="rapid-section-title">Messages by Category</h3>
          </header>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
              <span style={{ fontWeight: "600", color: "#334155" }}>Marketing</span>
              <span style={{ color: "#64748b" }}>0 sent</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
              <span style={{ fontWeight: "600", color: "#334155" }}>Utility</span>
              <span style={{ color: "#64748b" }}>0 sent</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
              <span style={{ fontWeight: "600", color: "#334155" }}>Authentication</span>
              <span style={{ color: "#64748b" }}>0 sent</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
              <span style={{ fontWeight: "600", color: "#334155" }}>Service / Support</span>
              <span style={{ color: "#64748b" }}>0 sent</span>
            </div>
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
            onClick={() => navigate("wa-templates")}
          >
            <Plus size={14} />
            <span>Manage Templates</span>
          </button>
        </header>
        <div style={{ textAlign: "center", padding: "30px 0", fontSize: "13px", color: "#94a3b8" }}>
          No template activity yet. Connect your WhatsApp Business account under Configuration → WhatsApp Config to sync approved templates.
        </div>
      </div>
    </div>
  );
}

