"use client";
import { useState } from "react";
import TemplatePreview from "./template-preview";
import { useWorkspace } from "../local-provider";
import {
  uid,
  now,
  eligibleContacts,
  validateCampaign,
  simulationRates,
  personalizeTemplate,
  type Channel,
  type LocalCampaign,
} from "@/lib/local-workspace";
import { audience, runCampaign } from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue, date, SearchBox } from "./ui";
export default function Campaigns({
  channel,
  initialStatus = "",
  notify,
}: {
  channel?: Channel;
  initialStatus?: string;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<LocalCampaign | null | undefined>(),
    [detail, setDetail] = useState(""),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState(initialStatus),
    [selected, setSelected] = useState<string[]>([]),
    [kind, setKind] = useState<Channel>(channel || "WhatsApp");
  const current = s.campaigns.find((c) => c.id === detail);
  const list = s.campaigns.filter(
    (c) =>
      (!channel || c.channel === channel) &&
      (!statusFilter || c.status === statusFilter) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const open = (c: LocalCampaign | null) => {
    setKind(c?.channel || channel || "WhatsApp");
    setSelected(c?.contactIds || []);
    setEdit(c);
  };
  const change = (c: LocalCampaign, status: LocalCampaign["status"]) => {
    if (
      update((state) => ({
        ...state,
        campaigns: state.campaigns.map((x) =>
          x.id === c.id ? { ...x, status, updatedAt: now() } : x,
        ),
        activities: [
          ...state.activities,
          {
            id: uid(),
            contactId: "",
            campaignId: c.id,
            kind: "note",
            channel: c.channel,
            description: `Campaign ${status.toLowerCase()} in draft workspace`,
            at: now(),
          },
        ],
      }))
    )
      notify(`Campaign ${status.toLowerCase()} locally`);
  };
  return (
    <Panel
      title={channel ? `${channel} campaigns` : "All campaigns"}
      description="Draft, schedule and simulate. No providers send from this workspace."
      action={
        <button className="primary" onClick={() => open(null)}>
          New campaign
        </button>
      }
    >
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search campaigns"
      />
      <label>
        Campaign status
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {["Draft", "Scheduled", "Paused", "Cancelled", "Completed"].map(
            (status) => (
              <option key={status}>{status}</option>
            ),
          )}
        </select>
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Eligible audience</th>
              <th>Scheduled</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{c.channel}</td>
                <td>
                  <Badge>{c.status}</Badge>
                </td>
                <td>
                  {eligibleContacts(s, c).length}/{c.contactIds.length}
                </td>
                <td>{date(c.scheduledAt)}</td>
                <td>
                  <button className="secondary" onClick={() => setDetail(c.id)}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length && (
        <Empty>
          No campaigns yet. Create a draft and select your audience.
        </Empty>
      )}
      {edit !== undefined && (
        <Modal
          title={edit ? "Edit campaign" : "New campaign"}
          close={() => setEdit(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                scheduled = String(f.get("scheduledAt") || "");
              if (scheduled && Date.parse(scheduled) <= Date.now()) {
                notify("Choose a future schedule time");
                return;
              }
              const c: LocalCampaign = {
                id: edit?.id || uid(),
                name: formValue(f, "name"),
                channel: kind,
                templateId: formValue(f, "template"),
                agentId: formValue(f, "agent"),
                senderId:
                  kind === "Email" ? formValue(f, "senderId") : undefined,
                contactIds: selected,
                status: scheduled ? "Scheduled" : "Draft",
                scheduledAt: scheduled ? new Date(scheduled).toISOString() : "",
                createdAt: edit?.createdAt || now(),
                updatedAt: now(),
              };
              if (
                update((state) => ({
                  ...state,
                  campaigns: edit
                    ? state.campaigns.map((x) => (x.id === edit.id ? c : x))
                    : [...state.campaigns, c],
                  activities: [
                    ...state.activities,
                    {
                      id: uid(),
                      contactId: "",
                      campaignId: c.id,
                      kind: "note",
                      channel: c.channel,
                      description: `${edit ? "Updated" : "Created"} ${c.status.toLowerCase()} campaign · Schedule intent only`,
                      at: now(),
                    },
                  ],
                }))
              ) {
                setEdit(undefined);
                setDetail(c.id);
                notify(
                  "Campaign saved locally. Schedules do not run in the background.",
                );
              }
            }}
          >
            <label>
              Campaign name
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={edit?.name}
              />
            </label>
            <label>
              Channel
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as Channel)}
              >
                {["WhatsApp", "Email", "AI calling"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {kind === "AI calling" ? (
              <label>
                Voice agent
                <select name="agent" required defaultValue={edit?.agentId}>
                  <option value="">Choose an agent</option>
                  {s.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Ready local template
                <select
                  key={kind}
                  name="template"
                  required
                  defaultValue={edit?.templateId}
                >
                  <option value="">Choose a template</option>
                  {s.templates
                    .filter((t) => t.channel === kind && t.status === "Ready")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {kind === "Email" && (
              <label>
                Local sender draft
                <select name="senderId" defaultValue={edit?.senderId || ""}>
                  <option value="">Unassigned sample sender</option>
                  {s.resources
                    .filter(
                      (r) => r.kind === "sender" && r.data.archived !== "true",
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.data.address}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              Populate from segment
              <select
                defaultValue=""
                onChange={(e) => {
                  const segment = s.resources.find(
                    (r) => r.id === e.target.value,
                  );
                  if (segment)
                    setSelected(audience(s, segment.data).map((c) => c.id));
                }}
              >
                <option value="">Choose saved segment</option>
                {s.resources
                  .filter((r) => r.kind === "segment")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="console-audience">
              <div className="console-actions">
                <strong>{selected.length} contacts selected</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSelected(s.contacts.map((c) => c.id))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSelected([])}
                >
                  Clear
                </button>
              </div>
              {s.contacts.map((c) => (
                <label className="console-check" key={c.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, c.id]
                          : ids.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.name}
                  <small>
                    {c.optedOut
                      ? "Opted out"
                      : c.consent
                        ? "Consent recorded"
                        : "No consent"}
                  </small>
                </label>
              ))}
            </div>
            <label>
              Optional schedule (your browser timezone)
              <input
                name="scheduledAt"
                type="datetime-local"
                defaultValue={
                  edit?.scheduledAt
                    ? new Date(
                        Date.parse(edit.scheduledAt) -
                          new Date(edit.scheduledAt).getTimezoneOffset() *
                            60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
            </label>
            <p>
              Scheduling records intent only. Use the explicit simulation action
              to preview locally.
            </p>
            <button className="primary">Save campaign</button>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title={current.name} close={() => setDetail("")}>
          <Badge>
            {current.status} · {current.channel}
          </Badge>
          <div className="console-status-grid">
            <div>
              <strong>{current.contactIds.length}</strong>
              <small>Selected contacts</small>
            </div>
            <div>
              <strong>{eligibleContacts(s, current).length}</strong>
              <small>Eligible now</small>
            </div>
            <div>
              <strong>
                {eligibleContacts(s, current).length *
                  simulationRates[current.channel]}
              </strong>
              <small>
                Sample credit estimate{" "}
                {current.channel === "AI calling" ? "(60s per call)" : ""}
              </small>
            </div>
          </div>
          <p>
            Eligibility requires consent, a channel address, no opt-out, and no
            stop-on-reply suppression. No delivery is reported by a simulation.
          </p>
          <p>Scheduled: {date(current.scheduledAt)}</p>
          {validateCampaign(s, current).map((err) => (
            <div className="console-notice" key={err}>
              {err}
            </div>
          ))}
          <div className="console-actions">
            {!["Completed", "Cancelled"].includes(current.status) && (
              <>
                <button
                  className="secondary"
                  onClick={() => {
                    setDetail("");
                    open(current);
                  }}
                >
                  Edit
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    change(
                      current,
                      current.status === "Paused" ? "Draft" : "Paused",
                    )
                  }
                >
                  {current.status === "Paused" ? "Resume as draft" : "Pause"}
                </button>
                <button
                  className="secondary"
                  onClick={() => change(current, "Cancelled")}
                >
                  Cancel campaign
                </button>
                <button
                  className="primary"
                  disabled={
                    Boolean(validateCampaign(s, current).length) ||
                    current.status === "Paused"
                  }
                  onClick={() => {
                    try {
                      if (update((state) => runCampaign(state, current.id)))
                        notify(
                          "Campaign simulated. Review inbox, activity and sample credits.",
                        );
                    } catch (err) {
                      notify((err as Error).message);
                    }
                  }}
                >
                  Simulate now
                </button>
              </>
            )}
            <button
              className="secondary"
              onClick={() => {
                const copy = {
                  ...current,
                  id: uid(),
                  name: current.name + " copy",
                  status: "Draft" as const,
                  scheduledAt: "",
                  createdAt: now(),
                  updatedAt: now(),
                  runId: undefined,
                };
                if (
                  update((state) => ({
                    ...state,
                    campaigns: [...state.campaigns, copy],
                  }))
                ) {
                  setDetail(copy.id);
                  notify("Draft copy created");
                }
              }}
            >
              Duplicate
            </button>
          </div>
          {current.channel === "Email" && (
            <p>
              Sender draft:{" "}
              {s.resources.find((r) => r.id === current.senderId)?.name ||
                "Unassigned sample sender"}{" "}
              · Not connected
            </p>
          )}
          {(() => {
            const snapshot = s.messages.find(
              (m) => m.campaignId === current.id && m.template,
            )?.template;
            const template = s.templates.find(
              (t) => t.id === current.templateId,
            );
            const person = s.contacts.find((c) =>
              current.contactIds.includes(c.id),
            );
            const content =
              current.status === "Completed"
                ? snapshot
                : template && person
                  ? personalizeTemplate(template, person)
                  : template;
            return content ? (
              <section className="console-template-review">
                <h3>
                  {snapshot ? "Saved simulation content" : "Content preview"}
                </h3>
                <TemplatePreview content={content} />
              </section>
            ) : null;
          })()}
          <h3 className="console-subtitle">Execution history</h3>
          {s.activities
            .filter((a) => a.campaignId === current.id)
            .map((a) => (
              <p key={a.id}>
                {s.contacts.find((c) => c.id === a.contactId)?.name} ·{" "}
                {a.description} · {date(a.at)}
              </p>
            ))}
          {!current.runId && <Empty>No simulation run yet.</Empty>}
          <button className="secondary" disabled>
            Launch live — provider acceptance required
          </button>
        </Modal>
      )}
    </Panel>
  );
}
