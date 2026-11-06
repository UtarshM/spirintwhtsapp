"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { balance, toCsv } from "@/lib/local-workspace";
import { dashboardMetrics, inDashboardRange, type DateRange } from "@/lib/dashboard-metrics";
import { Panel, Empty, Badge, date, download } from "./ui";
export default function Reports({
  automation = false,
}: {
  automation?: boolean;
}) {
  const { state: s } = useWorkspace();
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [channel, setChannel] = useState("");
  const [automationTab, setAutomationTab] = useState<string>("Lead Automation");
  const range: DateRange = { from: start, through: end, ...(start && end && start > end ? { error: "End date must be on or after start date." } : {}) };
  const metrics = dashboardMetrics(s, range);
  const rows = metrics.activity.filter(a => !channel || a.channel === channel);
  const cost = metrics.usage;
  const runs = s.sequenceRuns.filter(run =>
    inDashboardRange(run.startedAt, range, s.settings.timezone) &&
    (!channel || run.steps.some(step => step.type === channel))
  );
  const byChannel = ["WhatsApp", "Email", "AI calling"].map((channel) => ({
    channel,
    count: rows.filter((a) => a.channel === channel && a.kind === "simulation")
      .length,
  }));

  const activeRuns = runs.filter((r) => r.status === "Running" || r.status === "Waiting").length;
  const completedRuns = runs.filter((r) => r.status === "Completed").length;

  return (
    <>
      <Panel
        title={automation ? "Reports · Automation Reports" : "Reports · Analytics & Activity"}
        description={
          automation
            ? "Track automated multi-step trigger flows across Abandoned Carts, Shopify Orders, and Lead Nurturing sequences."
            : "Aggregated workspace performance metrics, channel distribution, and simulated event audit history."
        }
        action={
          <button
            className="secondary"
            disabled={!!range.error}
            onClick={() =>
              download(
                automation ? "automation-reports.csv" : "workspace-analytics.csv",
                toCsv([
                  ["time", "contact", "channel", "event", "description"],
                  ...rows.map((a) => [
                    a.at,
                    s.contacts.find((c) => c.id === a.contactId)?.name,
                    a.channel,
                    a.kind,
                    a.description,
                  ]),
                ]),
                "text/csv",
              )
            }
          >
            Export CSV
          </button>
        }
      >
        {/* Subtabs for Automation */}
        {automation && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
            {["Lead Automation", "Abandoned Cart", "Orders & Purchases", "Custom Triggers"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={automationTab === tab ? "primary" : "secondary"}
                style={{ padding: "6px 14px", fontSize: 13, borderRadius: 20 }}
                onClick={() => setAutomationTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
          {automation ? (
            <>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">TOTAL AUTOMATIONS</span>
                <div className="rapid-stat-value">{s.sequences.length}</div>
                <span className="rapid-stat-sub">Active workflow sequences</span>
              </div>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">TRIGGERED RUNS</span>
                <div className="rapid-stat-value">{runs.length}</div>
                <span className="rapid-stat-sub">{activeRuns} active in progress</span>
              </div>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">COMPLETED FLOWS</span>
                <div className="rapid-stat-value">{completedRuns}</div>
                <span className="rapid-stat-sub">100% step completion</span>
              </div>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">TOTAL CREDITS USED</span>
                <div className="rapid-stat-value">{cost}</div>
                <span className="rapid-stat-sub">Simulation credits burned</span>
              </div>
            </>
          ) : (
            <>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">TOTAL ACTIVITY</span>
                <div className="rapid-stat-value">{rows.length}</div>
                <span className="rapid-stat-sub">Logged workspace events</span>
              </div>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">SIMULATION RUNS</span>
                <div className="rapid-stat-value">{rows.filter((a) => a.kind === "simulation").length}</div>
                <span className="rapid-stat-sub">Outreach broadcasts</span>
              </div>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">INCOMING REPLIES</span>
                <div className="rapid-stat-value">{rows.filter((a) => a.kind === "inbound_reply").length}</div>
                <span className="rapid-stat-sub">Simulated responses</span>
              </div>
              <div className="rapid-stat-card">
                <span className="rapid-stat-label">SAMPLE CREDITS</span>
                <div className="rapid-stat-value">{balance(s)}</div>
                <span className="rapid-stat-sub">Available test credits</span>
              </div>
            </>
          )}
        </div>

        <div className="console-toolbar">
          <label>
            From
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Through
            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label>
            Channel
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="">All channels</option>
              {byChannel.map((c) => (
                <option key={c.channel}>{c.channel}</option>
              ))}
            </select>
          </label>
        </div>
        {range.error && <p role="alert">{range.error}</p>}
        <p>Calendar dates use {s.settings.timezone}. Usage covers all channels; the channel selector filters activity and sequence runs.</p>

        <div className="console-bars">
          {byChannel.map((c) => (
            <div key={c.channel}>
              <span>{c.channel}</span>
              <div>
                <i
                  style={{
                    width: `${(c.count / Math.max(1, ...byChannel.map((x) => x.count))) * 100}%`,
                  }}
                />
              </div>
              <strong>{c.count}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={
          automation ? "Sequence Execution Details" : "Local Activity History"
        }
      >
        {automation && (
          <div className="console-card-grid" style={{ marginBottom: 20 }}>
            {runs.map((run) => (
              <article className="console-mini-card" key={run.id}>
                <strong>
                  {s.sequences.find((seq) => seq.id === run.sequenceId)?.name || "Automation Sequence"}
                </strong>
                <p>{s.contacts.find((c) => c.id === run.contactId)?.name || "Customer"}</p>
                <Badge>{run.status}</Badge>
                <p style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                  {run.cursor}/{run.steps.length} steps processed · Started {date(run.startedAt)}
                </p>
              </article>
            ))}
            {!runs.length && (
              <Empty>No sequence automation runs recorded in this date range.</Empty>
            )}
          </div>
        )}

        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Time</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Contact</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Channel</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Event</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{date(a.at)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>
                    {s.contacts.find((c) => c.id === a.contactId)?.name || "Workspace"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#334155" }}>{a.channel || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <Badge>{a.kind}</Badge>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>No local activity in this date range.</Empty>}
      </Panel>
    </>
  );
}
