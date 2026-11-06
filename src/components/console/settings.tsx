"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import {
  channels,
  uid,
  now,
  toCsv,
  validateBackup,
  createLocalWorkspace,
  storageKey,
  type Channel,
} from "@/lib/local-workspace";
import { Panel, Empty, formValue, download, date, Modal, Badge } from "./ui";
export default function Settings({
  view,
  notify,
}: {
  view: string;
  notify: (s: string) => void;
}) {
  const { state: s, update, replace, storage } = useWorkspace();
  const [channel, setChannel] = useState<Channel>("WhatsApp"),
    [reset, setReset] = useState(false),
    [importData, setImportData] = useState<ReturnType<
      typeof validateBackup
    > | null>(null);
  if (view === "Billing")
    return (
      <>
        <Panel
          title="Subscription & credits"
          description="All credits here are sample units with no monetary value. No payment can be made in this workspace."
        >
          <div className="console-status-grid">
            <div>
              <strong>
                {s.transactions.reduce((sum, t) => sum + t.credits, 0)}
              </strong>
              <small>Sample balance</small>
            </div>
            <div>
              <strong>
                {
                  -s.transactions
                    .filter((t) => t.credits < 0)
                    .reduce((sum, t) => sum + t.credits, 0)
                }
              </strong>
              <small>Sample usage</small>
            </div>
            <div>
              <strong>{s.settings.lowBalance}</strong>
              <small>Low-balance threshold</small>
            </div>
          </div>
          <div className="console-card-grid">
            {[
              ["Connect", 2999],
              ["Grow", 3999],
              ["Scale", 9999],
            ].map(([name, price]) => (
              <article className="console-mini-card" key={name}>
                <h3>{name}</h3>
                <strong>
                  ₹{Number(price).toLocaleString("en-IN")}/month + GST
                </strong>
                <p>
                  Platform plan draft. Usage billed separately at approved
                  production rates later.
                </p>
                <button className="secondary" disabled>
                  Checkout unavailable
                </button>
              </article>
            ))}
          </div>
          <button
            className="primary"
            onClick={() => {
              if (
                update((state) => ({
                  ...state,
                  transactions: [
                    ...state.transactions,
                    {
                      id: uid(),
                      kind: "Sample top-up",
                      credits: 500,
                      at: now(),
                      reference: "Free sample credits · No payment",
                    },
                  ],
                }))
              )
                notify("500 sample credits added. No payment occurred.");
            }}
          >
            Add 500 sample credits
          </button>
          <h3 className="console-subtitle">Orders & invoices</h3>
          <Empty>
            No real orders or invoices. Simulated credit additions never create
            a payment record.
          </Empty>
        </Panel>
        <Panel
          title="Sample credit ledger"
          action={
            <button
              className="secondary"
              onClick={() =>
                download(
                  "sample-credit-ledger.csv",
                  toCsv([
                    ["time", "type", "credits", "reference"],
                    ...s.transactions.map((t) => [
                      t.at,
                      t.kind,
                      t.credits,
                      t.reference,
                    ]),
                  ]),
                  "text/csv",
                )
              }
            >
              Export ledger
            </button>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Credits</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {[...s.transactions].reverse().map((t) => (
                  <tr key={t.id}>
                    <td>{date(t.at)}</td>
                    <td>{t.kind}</td>
                    <td>{t.credits}</td>
                    <td>{t.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </>
    );
  if (view === "Working days") {
    const handleQuickPreset = (preset: "skipWeekend" | "monFri" | "allDays") => {
      let updatedWindows = [...s.windows[channel]];
      if (preset === "skipWeekend") {
        // Sunday is index 0, Saturday is index 6
        updatedWindows = updatedWindows.map((w, idx) =>
          idx === 0 || idx === 6 ? { ...w, enabled: false } : { ...w, enabled: true },
        );
      } else if (preset === "monFri") {
        updatedWindows = updatedWindows.map((w, idx) =>
          idx === 0 || idx === 6
            ? { ...w, enabled: false }
            : { ...w, enabled: true, start: "09:00", end: "18:00" },
        );
      } else if (preset === "allDays") {
        updatedWindows = updatedWindows.map((w) => ({
          ...w,
          enabled: true,
          start: "00:00",
          end: "23:59",
        }));
      }

      if (
        update((state) => ({
          ...state,
          windows: { ...state.windows, [channel]: updatedWindows },
        }))
      ) {
        notify(`Preset applied to ${channel}`);
      }
    };

    return (
      <Panel
        title="Working Days & Outreach Windows"
        description={`Configure safe operational hours per channel · Timezone: ${s.settings.timezone}. Outreach is automatically paused outside configured hours.`}
      >
        {/* Channel Selector Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {channels.map((c) => {
            const activeDays = s.windows[c]?.filter((w) => w.enabled).length || 0;
            return (
              <button
                key={c}
                type="button"
                className={channel === c ? "primary" : "secondary"}
                style={{ padding: "6px 14px", fontSize: 13, borderRadius: 20 }}
                onClick={() => setChannel(c)}
              >
                {c === "WhatsApp" ? "💬 WhatsApp" : c === "Email" ? "✉️ Email" : "📞 AI Calling"}{" "}
                <span style={{ opacity: 0.8, fontSize: 11, marginLeft: 4 }}>
                  ({activeDays}/7 days)
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Presets Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Quick Presets for {channel}:
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => handleQuickPreset("skipWeekend")}
            >
              Skip Weekend (Sat & Sun)
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => handleQuickPreset("monFri")}
            >
              Mon - Fri (09:00 - 18:00)
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => handleQuickPreset("allDays")}
            >
              24/7 Sending Window
            </button>
          </div>
        </div>

        <form
          key={`${channel}-${JSON.stringify(s.windows[channel])}`}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const windows = Array.from({ length: 7 }, (_, i) => ({
              enabled: f.get(`on-${i}`) === "on",
              start: formValue(f, `start-${i}`),
              end: formValue(f, `end-${i}`),
            }));
            if (windows.some((w) => w.enabled && w.start >= w.end)) {
              notify("Each enabled day needs an end time after its start time");
              return;
            }
            if (
              update((state) => ({
                ...state,
                windows: { ...state.windows, [channel]: windows },
              }))
            )
              notify(`${channel} working schedule saved successfully`);
          }}
        >
          {[
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ].map((day, i) => (
            <div className="console-schedule" key={day}>
              <label className="console-check" style={{ fontWeight: 600, color: s.windows[channel][i].enabled ? "#0f172a" : "#94a3b8" }}>
                <input
                  type="checkbox"
                  name={`on-${i}`}
                  defaultChecked={s.windows[channel][i].enabled}
                />
                {day}
              </label>
              <label>
                Start
                <input
                  name={`start-${i}`}
                  type="time"
                  required
                  defaultValue={s.windows[channel][i].start}
                />
              </label>
              <label>
                End
                <input
                  name={`end-${i}`}
                  type="time"
                  required
                  defaultValue={s.windows[channel][i].end}
                />
              </label>
            </div>
          ))}
          <div style={{ marginTop: 18 }}>
            <button className="primary">Save {channel} Sending Windows</button>
          </div>
        </form>

        {/* All Channels At A Glance */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            All Channels at a Glance
          </h4>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Day</th>
                  <th style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#475569" }}>WhatsApp</th>
                  <th style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Email</th>
                  <th style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#475569" }}>AI Calling</th>
                </tr>
              </thead>
              <tbody>
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => (
                  <tr key={day} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{day}</td>
                    {["WhatsApp", "Email", "AI calling"].map((ch) => {
                      const win = s.windows[ch]?.[idx];
                      return (
                        <td key={ch} style={{ padding: "8px 12px", fontSize: 12 }}>
                          {win?.enabled ? (
                            <span style={{ color: "#059669", fontWeight: 600 }}>
                              ✓ {win.start} - {win.end}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Disabled</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    );
  }
  if (view === "Team") {
    const totalMembers = s.team.length;
    const activeMembers = s.team.filter((m) => m.status === "Active").length;
    const invitedMembers = s.team.filter((m) => m.status === "Invited").length;
    const maxSeats = 5;

    return (
      <Panel
        title="Team & Organization Management"
        description="Manage team access, role permissions, and seats for your company workspace."
      >
        {/* Top Seat & Role Summary Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Team Seats Quota</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {totalMembers} <span style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>/ {maxSeats} seats</span>
            </div>
            <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (totalMembers / maxSeats) * 100)}%`, height: "100%", background: "#4f46e5", borderRadius: 3 }} />
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Members</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#059669", marginTop: 4 }}>{activeMembers}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Full workspace access enabled</div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending Invites</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#d97706", marginTop: 4 }}>{invitedMembers}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Awaiting link acceptance</div>
          </div>
        </div>

        {/* Invite Member Form */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <strong style={{ fontSize: 14, color: "#0f172a", display: "block", marginBottom: 10 }}>Invite New Team Member</strong>
          <form
            className="console-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                email = formValue(f, "email"),
                name = formValue(f, "name"),
                role = formValue(f, "role") as "Administrator" | "Sales agent";

              if (s.team.some((t) => t.email.toLowerCase() === email.toLowerCase())) {
                notify("This email is already in your team roster");
                return;
              }
              if (s.team.length >= maxSeats) {
                notify("Seat limit reached. Upgrade your subscription to add more team members.");
                return;
              }
              if (
                update((state) => ({
                  ...state,
                  team: [
                    ...state.team,
                    {
                      id: uid(),
                      name,
                      email,
                      role,
                      status: "Invited",
                    },
                  ],
                }))
              ) {
                e.currentTarget.reset();
                notify(`Invitation sent to ${email} as ${role}!`);
              }
            }}
          >
            <label>
              Full Name
              <input name="name" required maxLength={200} placeholder="e.g. Rahul Gupta" />
            </label>
            <label>
              Work Email
              <input name="email" type="email" required placeholder="rahul@company.com" />
            </label>
            <label>
              Role & Permissions
              <select name="role">
                <option value="Sales agent">Sales agent (Inboxes & Calls)</option>
                <option value="Administrator">Administrator (Campaigns & Settings)</option>
              </select>
            </label>
            <button className="primary" style={{ height: 40, marginTop: "auto" }}>
              Send Invite
            </button>
          </form>
        </div>

        {/* Team Members Table */}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {s.team.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: t.role === "Owner" ? "#ede9fe" : "#e0e7ff",
                          color: t.role === "Owner" ? "#6d28d9" : "#3730a3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ display: "block", color: "#0f172a" }}>{t.name}</strong>
                        <small style={{ color: "#64748b" }}>{t.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          t.role === "Owner"
                            ? "#ede9fe"
                            : t.role === "Administrator"
                              ? "#e0e7ff"
                              : "#ecfdf5",
                        color:
                          t.role === "Owner"
                            ? "#6d28d9"
                            : t.role === "Administrator"
                              ? "#3730a3"
                              : "#065f46",
                      }}
                    >
                      {t.role}
                    </span>
                  </td>
                  <td>
                    <Badge>
                      {t.status === "Active" ? "Active" : "Invited"}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {t.role !== "Owner" && (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "3px 8px", fontSize: 11 }}
                          onClick={() => {
                            const newStatus = t.status === "Active" ? "Invited" : "Active";
                            update((state) => ({
                              ...state,
                              team: state.team.map((m) => (m.id === t.id ? { ...m, status: newStatus } : m)),
                            }));
                            notify(`Updated status for ${t.name}`);
                          }}
                        >
                          {t.status === "Active" ? "Revoke" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "3px 8px", fontSize: 11, color: "#dc2626" }}
                          onClick={() => {
                            update((state) => ({
                              ...state,
                              team: state.team.filter((m) => m.id !== t.id),
                            }));
                            notify(`Removed ${t.name} from team`);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }
  return (
    <>
      <Panel
        title="Workspace settings"
        description="Saved in this browser for the sample workspace."
      >
        <form
          className="console-narrow"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              const timezone = formValue(f, "timezone");
              new Intl.DateTimeFormat("en", { timeZone: timezone });
              if (
                update((state) => ({
                  ...state,
                  settings: {
                    ...state.settings,
                    name: formValue(f, "name"),
                    timezone,
                    lowBalance: Number(f.get("lowBalance")),
                    stopOnReply: f.get("stopOnReply") === "on",
                    notifications: f.get("notifications") === "on",
                  },
                }))
              )
                notify("Workspace preferences saved");
            } catch {
              notify("Use a valid timezone such as Asia/Kolkata");
            }
          }}
        >
          <label>
            Workspace name
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={s.settings.name}
            />
          </label>
          <label>
            Timezone
            <input
              name="timezone"
              required
              defaultValue={s.settings.timezone}
            />
          </label>
          <label>
            Low sample balance threshold
            <input
              type="number"
              name="lowBalance"
              min={0}
              required
              defaultValue={s.settings.lowBalance}
            />
          </label>
          <label className="console-check">
            <input
              type="checkbox"
              name="stopOnReply"
              defaultChecked={s.settings.stopOnReply}
            />
            Stop pending simulations after an incoming reply
          </label>
          <label className="console-check">
            <input
              type="checkbox"
              name="notifications"
              defaultChecked={s.settings.notifications}
            />
            Show local workspace notifications
          </label>
          <button className="primary">Save preferences</button>
        </form>
      </Panel>
      <Panel
        title="Data & backups"
        description={
          storage === "account"
            ? "Export your draft workspace, including unsaved changes, before replacing it. Account backups never include provider credentials."
            : "Backups contain local sample information. Do not import live customer data into this preview."
        }
      >
        <div className="console-actions">
          <button
            className="secondary"
            onClick={() =>
              download(
                "sprint-workspace-backup.json",
                JSON.stringify(s, null, 2),
                "application/json",
              )
            }
          >
            Export backup
          </button>
          {storage === "browser" && (
            <button
              className="secondary"
              onClick={() => {
                try {
                  const raw = localStorage.getItem(storageKey);
                  if (!raw) {
                    notify("No stored workspace file yet");
                    return;
                  }
                  download(
                    "sprint-stored-data-recovery.json",
                    raw,
                    "application/json",
                  );
                } catch {
                  notify("Browser storage is unavailable");
                }
              }}
            >
              Download stored recovery data
            </button>
          )}
          <label className="secondary console-file">
            Review backup import
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                try {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10000000)
                      throw Error("Backup is too large");
                    setImportData(
                      validateBackup(JSON.parse(await file.text())),
                    );
                  }
                } catch (err) {
                  notify("Invalid backup: " + (err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </label>
          {storage === "browser" && (
            <button className="secondary" onClick={() => setReset(true)}>
              Reset sample workspace
            </button>
          )}
        </div>
      </Panel>
      {importData && (
        <Modal
          title="Review backup replacement"
          close={() => setImportData(null)}
        >
          <p>
            This backup has {importData.contacts.length} contacts,{" "}
            {importData.campaigns.length} campaigns and{" "}
            {importData.resources.length} setup drafts. Import replaces this
            sample workspace.
          </p>
          <button
            className="secondary"
            onClick={() =>
              download(
                "sprint-before-import.json",
                JSON.stringify(s, null, 2),
                "application/json",
              )
            }
          >
            Export current data first
          </button>
          <button
            className="primary"
            onClick={() => {
              if (replace(importData)) {
                setImportData(null);
                notify("Backup imported");
              }
            }}
          >
            Replace draft workspace
          </button>
        </Modal>
      )}
      {reset && (
        <Modal title="Reset sample workspace" close={() => setReset(false)}>
          <p>Export a backup before replacing your current local samples.</p>
          <button
            className="secondary"
            onClick={() =>
              download(
                "sprint-before-reset.json",
                JSON.stringify(s, null, 2),
                "application/json",
              )
            }
          >
            Export current backup
          </button>
          <button
            className="primary"
            onClick={() => {
              if (replace(createLocalWorkspace())) {
                setReset(false);
                notify("Sample workspace reset");
              }
            }}
          >
            Reset local sample data
          </button>
        </Modal>
      )}
    </>
  );
}
