"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { balance, toCsv } from "@/lib/local-workspace";
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
  const rows = s.activities.filter(
    (a) =>
      (!start || Date.parse(a.at) >= Date.parse(`${start}T00:00:00`)) &&
      (!end || Date.parse(a.at) < new Date(`${end}T23:59:59.999`).getTime()) &&
      (!channel || a.channel === channel),
  );
  const cost = s.transactions
    .filter(
      (t) =>
        t.kind === "Simulation usage" &&
        (!start || Date.parse(t.at) >= Date.parse(`${start}T00:00:00`)) &&
        (!end || Date.parse(t.at) < new Date(`${end}T23:59:59.999`).getTime()),
    )
    .reduce((sum, t) => sum - t.credits, 0);
  const byChannel = ["WhatsApp", "Email", "AI calling"].map((channel) => ({
    channel,
    count: rows.filter((a) => a.channel === channel && a.kind === "simulation")
      .length,
  }));
  return (
    <>
      <Panel
        title={automation ? "Automation reports" : "Analytics"}
        description="Computed from local workspace activity. Simulations are not delivered, read, opened or billed provider events."
        action={
          <button
            className="secondary"
            onClick={() =>
              download(
                "sprint-local-activity.csv",
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
            Export filtered activity
          </button>
        }
      >
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
        <div className="console-status-grid">
          <div>
            <strong>
              {rows.filter((a) => a.kind === "simulation").length}
            </strong>
            <small>Simulation events in range</small>
          </div>
          <div>
            <strong>{cost}</strong>
            <small>Sample credits used (all channels)</small>
          </div>
          <div>
            <strong>
              {rows.filter((a) => a.kind === "inbound_reply").length}
            </strong>
            <small>Simulated incoming replies</small>
          </div>
          <div>
            <strong>{balance(s)}</strong>
            <small>Current sample credit balance</small>
          </div>
        </div>
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
        <p>
          Live delivery/read/open rates: Not available. No provider event
          connection exists.
        </p>
      </Panel>
      <Panel
        title={
          automation ? "Sequence execution report" : "Local activity history"
        }
      >
        {automation && (
          <div className="console-card-grid">
            {s.sequenceRuns.map((run) => (
              <article className="console-mini-card" key={run.id}>
                <strong>
                  {s.sequences.find((seq) => seq.id === run.sequenceId)?.name}
                </strong>
                <p>{s.contacts.find((c) => c.id === run.contactId)?.name}</p>
                <Badge>{run.status}</Badge>
                <p>
                  {run.cursor}/{run.steps.length} steps processed
                </p>
              </article>
            ))}
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Contact</th>
                <th>Channel</th>
                <th>Event</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((a) => (
                <tr key={a.id}>
                  <td>{date(a.at)}</td>
                  <td>
                    {s.contacts.find((c) => c.id === a.contactId)?.name ||
                      "Workspace"}
                  </td>
                  <td>{a.channel || "—"}</td>
                  <td>
                    <Badge>{a.kind}</Badge>
                  </td>
                  <td>{a.description}</td>
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
