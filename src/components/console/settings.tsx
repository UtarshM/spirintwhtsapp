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
  const { state: s, update, replace } = useWorkspace();
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
  if (view === "Working days")
    return (
      <Panel
        title="Working days & sending windows"
        description={`Draft schedule · ${s.settings.timezone}. Simulations run only when explicitly requested; no background sends.`}
      >
        <label>
          Channel
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
          >
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <form
          key={channel}
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
              notify("Channel schedule saved");
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
              <label className="console-check">
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
          <button className="primary">Save sending windows</button>
        </form>
      </Panel>
    );
  if (view === "Team")
    return (
      <Panel
        title="Team & assignment"
        description="Local team roster only. This does not grant account access or send invitations."
      >
        <form
          className="console-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              email = formValue(f, "email");
            if (
              s.team.some((t) => t.email.toLowerCase() === email.toLowerCase())
            ) {
              notify("This email is already in the local roster");
              return;
            }
            if (
              update((state) => ({
                ...state,
                team: [
                  ...state.team,
                  {
                    id: uid(),
                    name: formValue(f, "name"),
                    email,
                    role: formValue(f, "role") as
                      "Administrator" | "Sales agent",
                    status: "Invited",
                  },
                ],
              }))
            ) {
              e.currentTarget.reset();
              notify(
                "Local invitation draft added. No email sent or account access granted.",
              );
            }
          }}
        >
          <label>
            Name
            <input name="name" required maxLength={200} />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Draft role
            <select name="role">
              <option>Sales agent</option>
              <option>Administrator</option>
            </select>
          </label>
          <button className="primary">Add invitation draft</button>
        </form>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Draft role</th>
                <th>Local status</th>
              </tr>
            </thead>
            <tbody>
              {s.team.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.role}</td>
                  <td>
                    <Badge>
                      {t.status === "Invited" ? "Invitation draft" : t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
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
        description="Backups contain local sample information. Do not import live customer data into this preview."
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
          <button className="secondary" onClick={() => setReset(true)}>
            Reset sample workspace
          </button>
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
            Replace local workspace
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
