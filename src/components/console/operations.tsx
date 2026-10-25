"use client";
import { useEffect, useState } from "react";
import { useWorkspace } from "../local-provider";
import { now, uid, toCsv, simulationRates } from "@/lib/local-workspace";
import type { AccountIdentity } from "@/lib/workspace-document";
import { createReminder, reminderTask, saveAvailability } from "@/lib/booking";
import { Panel, Badge, Empty, date, download, formValue } from "./ui";
import Resources from "./resources";

type Props = {
  page: string;
  navigate: (id: string) => void;
  notify: (text: string) => void;
  account?: AccountIdentity;
};
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export default function Operations({ page, navigate, notify, account }: Props) {
  const { state: s, update } = useWorkspace();
  const [billing, setBilling] = useState<{
      orders: Record<string, unknown>[];
      rates: Record<string, unknown>[];
    } | null>(null),
    [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!account || !["orders", "rates"].includes(page)) return;
    const controller = new AbortController();
    void fetch("/api/billing", {
      cache: "no-store",
      headers: { "x-workspace-id": account.workspaceId },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error?.message || "Billing could not be loaded.");
        setBilling(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message);
      });
    return () => controller.abort();
  }, [account?.workspaceId, page]);
  const action = (id: string, text: string) => (
    <button className="secondary" onClick={() => navigate(id)}>
      {text}
    </button>
  );
  const activeBookings = s.resources.filter(
    (r) =>
      r.kind === "booking" &&
      r.data.status !== "Cancelled" &&
      r.data.archived !== "true",
  );
  if (page === "sheets" || page === "webhooks")
    return (
      <>
        <Panel
          title={
            page === "sheets"
              ? "Google Sheets lead capture"
              : "Webhook lead capture"
          }
          description="Prepare source mapping and test a sample payload. External ingestion is not enabled."
        >
          <p>
            {page === "sheets"
              ? "Keep name, email, international phone, explicit consent and source tags in separate columns. A public sheet URL alone does not grant access or start synchronization."
              : "Signed endpoints, event replay protection and source authorization will be enabled with the provider integration. Do not paste secrets into a draft."}
          </p>
          {action("qualified", "View qualified leads")}
        </Panel>
        <Resources
          kind="lead-source"
          provider={page === "sheets" ? "Google Sheets" : "Webhook"}
          notify={notify}
        />
      </>
    );
  if (page === "handoffs" || page === "automation-handoffs")
    return (
      <>
        <Panel
          title="Human takeover & assignment"
          description="Track context, assign a reviewer and suppress pending simulations when a handoff is recorded."
        >
          <div className="console-status-grid">
            <div>
              <strong>
                {s.threads.filter((t) => t.status === "Open").length}
              </strong>
              <small>Open workspace conversations</small>
            </div>
            <div>
              <strong>{s.tasks.filter((t) => !t.done).length}</strong>
              <small>Pending follow-up tasks</small>
            </div>
          </div>
          <div className="console-actions">
            {action("wa-inbox", "Assign WhatsApp conversations")}
            {action("email-inbox", "Assign email conversations")}
            {action("tasks", "Review follow-up tasks")}
          </div>
        </Panel>
        <Resources kind="transfer" notify={notify} />
      </>
    );
  if (page === "inbox-overview")
    return (
      <Panel
        title="All conversations"
        description="Conversations, assignments, reply drafts and sample attachments share your workspace storage."
      >
        <div className="console-card-grid">
          {["WhatsApp", "Email"].map((channel) => (
            <article className="console-mini-card" key={channel}>
              <h3>{channel}</h3>
              <strong>
                {
                  s.threads.filter(
                    (t) => t.channel === channel && t.status === "Open",
                  ).length
                }{" "}
                open
              </strong>
              <p>
                {
                  s.threads.filter(
                    (t) => t.channel === channel && t.status === "Closed",
                  ).length
                }{" "}
                closed conversations
              </p>
              {action(
                channel === "WhatsApp" ? "wa-inbox" : "email-inbox",
                "Open conversations",
              )}
            </article>
          ))}
        </div>
        <p>
          Incoming provider replies are unavailable until official connection
          and synchronization acceptance. Local incoming tests stay labelled as
          simulations.
        </p>
      </Panel>
    );
  if (page === "wa-onboarding") {
    const draft = s.resources.find(
      (r) => r.kind === "channel-setup" && r.data.channel === "WhatsApp",
    );
    return (
      <>
        <Panel
          title="Connect WhatsApp Business"
          description="Prepare your business-owned account. Saving these details does not connect to Meta."
        >
          <ol className="console-setup-steps">
            <li>
              <strong>Prepare your business</strong>
              <span>
                Business name, public website and a WhatsApp number you control.
              </span>
            </li>
            <li>
              <strong>Authorize official onboarding</strong>
              <span>
                Business portfolio, WhatsApp account and number selection
                through Meta.
              </span>
            </li>
            <li>
              <strong>Complete account checks</strong>
              <span>
                Provider-confirmed phone, display-name and business verification
                status.
              </span>
            </li>
            <li>
              <strong>Test messaging and webhooks</strong>
              <span>
                Template and delivery acceptance before live broadcasts are
                enabled.
              </span>
            </li>
          </ol>
          <form
            className="console-narrow"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              const website = formValue(f, "website");
              try {
                if (website) {
                  const url = new URL(website);
                  if (
                    !["http:", "https:"].includes(url.protocol) ||
                    url.username ||
                    url.password
                  )
                    throw Error("Enter a public http or https website.");
                }
                const phone = formValue(f, "phone");
                if (!/^\+[1-9]\d{7,14}$/.test(phone))
                  throw Error("Use an international WhatsApp number.");
                if (
                  update((state) => ({
                    ...state,
                    resources: [
                      ...state.resources.filter((r) => r.id !== draft?.id),
                      {
                        id: draft?.id || uid(),
                        kind: "channel-setup",
                        name: formValue(f, "name"),
                        data: { channel: "WhatsApp", website, phone },
                        updatedAt: now(),
                      },
                    ],
                  }))
                )
                  notify(
                    "Business setup draft saved. No Meta account connected.",
                  );
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            <label>
              Business display name
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={draft?.name}
              />
            </label>
            <label>
              Public business website
              <input
                name="website"
                type="url"
                maxLength={2000}
                defaultValue={draft?.data.website}
              />
            </label>
            <label>
              Business WhatsApp number
              <input
                name="phone"
                required
                maxLength={16}
                placeholder="+919876543210"
                defaultValue={draft?.data.phone}
              />
            </label>
            <button className="primary">Save preparation draft</button>
          </form>
          <div className="console-actions">
            <button className="secondary" disabled>
              Official onboarding pending integration
            </button>
            {action("verification", "Blue tick preparation")}
          </div>
        </Panel>
      </>
    );
  }
  if (page === "wa-health")
    return (
      <Panel
        title="WhatsApp account health"
        description="Only provider-confirmed account data will appear here."
      >
        <div className="console-status-grid">
          {[
            "API connection",
            "Phone registration",
            "Business verification",
            "Display name",
            "Quality rating",
            "Messaging limit",
            "Template approval",
            "Webhook health",
          ].map((label) => (
            <div key={label}>
              <strong>—</strong>
              <small>{label} · Not connected</small>
            </div>
          ))}
        </div>
        <p>
          No business number is connected. Draft checklists cannot change
          account health or badge status.
        </p>
        <div className="console-actions">
          {action("wa-onboarding", "Prepare account connection")}
          {action("wa-templates", "Prepare templates")}
        </div>
      </Panel>
    );
  if (page === "email-setup" || page === "email-sync")
    return (
      <>
        <Panel
          title={
            page === "email-sync"
              ? "Email reply synchronization"
              : "Gmail & Zoho setup"
          }
          description="Mailbox authorization and synchronization require official provider acceptance."
        >
          <div className="console-card-grid">
            {["Gmail", "Zoho"].map((provider) => (
              <article key={provider} className="console-mini-card">
                <Badge>Not connected</Badge>
                <h3>{provider}</h3>
                <p>
                  Authorization, sender access, refresh/reconnection and
                  incoming-reply tests are pending.
                </p>
                <button className="secondary" disabled>
                  Connect {provider} — integration pending
                </button>
              </article>
            ))}
          </div>
          <div className="console-status-grid">
            {[
              "Last successful sync",
              "Last provider checkpoint",
              "Incoming replies",
              "Connection expiry",
            ].map((label) => (
              <div key={label}>
                <strong>—</strong>
                <small>{label} · Unavailable</small>
              </div>
            ))}
          </div>
          <div className="console-actions">
            {action("senders", "Prepare sender preferences")}
            {action("identities", "Prepare sender identity")}
            {action("email-inbox", "Review draft mailbox")}
          </div>
          <p>
            Passwords and API keys are never collected here. Draft mailboxes do
            not authenticate an email account.
          </p>
        </Panel>
      </>
    );
  if (page === "availability") {
    const rule = s.resources.find((r) => r.kind === "availability");
    return (
      <>
        <Panel
          title="Calendar availability"
          description="Workspace booking rules. No external calendar is connected."
        >
          <form
            className="console-narrow"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              try {
                if (
                  update((state) =>
                    saveAvailability(
                      state,
                      f.getAll("days").map(String),
                      formValue(f, "start"),
                      formValue(f, "end"),
                    ),
                  )
                )
                  notify(
                    "Availability saved. New appointments are checked against these hours.",
                  );
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            <fieldset>
              <legend>Available days</legend>
              {days.map((day, index) => (
                <label className="console-check" key={day}>
                  <input
                    type="checkbox"
                    name="days"
                    value={index}
                    defaultChecked={
                      rule
                        ? rule.data.days.split(",").includes(String(index))
                        : index > 0 && index < 6
                    }
                  />
                  {day}
                </label>
              ))}
            </fieldset>
            <label>
              Start
              <input
                name="start"
                type="time"
                required
                defaultValue={rule?.data.start || "09:00"}
              />
            </label>
            <label>
              End
              <input
                name="end"
                type="time"
                required
                defaultValue={rule?.data.end || "18:00"}
              />
            </label>
            <p>
              Saving uses this browser’s timezone:{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}.{" "}
              {rule && `Current rule timezone: ${rule.data.timezone}.`}
            </p>
            <button className="primary">Save availability</button>
          </form>
          <div className="console-actions">
            {action("bookings", "Manage appointments")}
            {action("reminders", "Prepare reminders")}
          </div>
          <p>
            Existing appointments are retained when availability changes.
            Overlap checks apply to active workspace bookings; external calendar
            conflicts are not known.
          </p>
        </Panel>
        <Panel title="Upcoming appointments">
          {activeBookings.length ? (
            activeBookings.map((booking) => (
              <div className="console-activity" key={booking.id}>
                <strong>{booking.name}</strong>
                <span>
                  {date(booking.data.start)} – {date(booking.data.end)}
                </span>
              </div>
            ))
          ) : (
            <Empty>No active appointments.</Empty>
          )}
        </Panel>
      </>
    );
  }
  if (page === "reminders")
    return (
      <>
        <Panel
          title="Appointment reminders"
          description="Save reminder drafts or create a follow-up task. No reminder is sent automatically."
        >
          <form
            className="console-narrow"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              try {
                if (
                  update((state) =>
                    createReminder(
                      state,
                      formValue(f, "booking"),
                      Number(f.get("minutes")),
                      formValue(f, "channel"),
                      formValue(f, "body"),
                    ),
                  )
                )
                  notify("Reminder draft saved; no message scheduled or sent.");
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          >
            <label>
              Appointment
              <select name="booking" required>
                <option value="">Choose active appointment</option>
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {date(b.data.start)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Remind before
              <select name="minutes">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">1 day</option>
              </select>
            </label>
            <label>
              Channel
              <select name="channel">
                <option>WhatsApp</option>
                <option>Email</option>
              </select>
            </label>
            <label>
              Message draft
              <textarea
                name="body"
                required
                rows={3}
                maxLength={2000}
                defaultValue="A reminder about your upcoming appointment. Please reply if you need to reschedule."
              />
            </label>
            <button className="primary" disabled={!activeBookings.length}>
              Save reminder draft
            </button>
          </form>
        </Panel>
        <Panel title="Reminder drafts">
          {s.resources
            .filter((r) => r.kind === "reminder")
            .map((r) => (
              <article className="console-mini-card" key={r.id}>
                <Badge>{r.data.status}</Badge>
                <h3>{r.name}</h3>
                <p>
                  {date(r.data.dueAt)} · {r.data.channel}
                </p>
                <p>{r.data.body}</p>
                <button
                  className="secondary"
                  disabled={!!r.data.taskId}
                  onClick={() => {
                    try {
                      if (update((state) => reminderTask(state, r.id)))
                        notify("Follow-up task created. No reminder was sent.");
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                >
                  Create review task
                </button>
              </article>
            ))}
          {!s.resources.some((r) => r.kind === "reminder") && (
            <Empty>No reminder drafts.</Empty>
          )}
        </Panel>
      </>
    );
  if (page === "orders" || page === "invoices" || page === "rates")
    return (
      <Panel
        title={
          page === "orders"
            ? "Orders"
            : page === "invoices"
              ? "Invoices"
              : "Credit rates"
        }
        description="Payment-provider records are separate from sample simulation credits."
      >
        {loadError && (
          <div className="console-error" role="alert">
            {loadError}
          </div>
        )}
        {page === "invoices" ? (
          <Empty>
            Tax invoice generation is not configured. Sample credit additions
            never create invoices.
          </Empty>
        ) : page === "rates" ? (
          <>
            <h3>Simulation units — no monetary value</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Sample units</th>
                    <th>Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(simulationRates).map(([channel, rate]) => (
                    <tr key={channel}>
                      <td>{channel}</td>
                      <td>{rate}</td>
                      <td>
                        {channel === "AI calling"
                          ? "Per started preview minute"
                          : "Per simulated message"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Approved production rates</h3>
            {account && !billing && !loadError ? (
              <p>Loading approved catalog…</p>
            ) : billing?.rates?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Unit</th>
                      <th>Microcredits</th>
                      <th>Effective</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.rates.map((r) => (
                      <tr key={String(r.id)}>
                        <td>{String(r.channel)}</td>
                        <td>{String(r.unit)}</td>
                        <td>{String(r.rate_microcredits)}</td>
                        <td>{date(String(r.effective_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                No approved production catalog loaded. Checkout remains
                disabled.
              </Empty>
            )}
          </>
        ) : account && !billing && !loadError ? (
          <p>Loading workspace orders…</p>
        ) : billing?.orders?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {billing.orders.map((order) => (
                  <tr key={String(order.id)}>
                    <td>{String(order.provider_order_id || order.id)}</td>
                    <td>{String(order.status)}</td>
                    <td>
                      ₹
                      {(Number(order.amount_paise) / 100).toLocaleString(
                        "en-IN",
                      )}
                    </td>
                    <td>{date(String(order.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            No payment orders loaded. Sample top-ups do not represent purchases.
          </Empty>
        )}
        <div className="console-actions">
          <button className="secondary" disabled>
            Checkout unavailable
          </button>
          {action("billing", "Plans & sample ledger")}
        </div>
      </Panel>
    );
  if (page === "channel-costs")
    return (
      <Panel
        title="Channel costs"
        description="Sample simulation units only. Provider charges, taxes and real billing are unavailable."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Preview usage</th>
                <th>Sample credits</th>
              </tr>
            </thead>
            <tbody>
              {["WhatsApp", "Email", "AI calling"].map((channel) => {
                const messages = s.messages.filter(
                  (m) =>
                    m.channel === channel &&
                    m.kind === "Simulation" &&
                    m.direction === "outbound",
                );
                const cost =
                  channel === "AI calling"
                    ? s.calls.reduce(
                        (sum, call) => sum + Math.ceil(call.duration / 60) * 5,
                        0,
                      )
                    : messages.length;
                return (
                  <tr key={channel}>
                    <td>{channel}</td>
                    <td>
                      {channel === "AI calling"
                        ? `${s.calls.length} scripted previews`
                        : `${messages.length} simulated messages`}
                    </td>
                    <td>{cost}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          Usage is derived from the recorded preview messages and call
          durations. The sample ledger remains the balance record.
        </p>
        {action("billing", "Review sample ledger")}
      </Panel>
    );
  if (page === "delivery")
    return (
      <Panel
        title="Delivery reports"
        description="Provider-confirmed delivery, read, failure and reply events will appear after integration."
      >
        <div className="console-status-grid">
          {["Sent", "Delivered", "Read / opened", "Failed"].map((label) => (
            <div key={label}>
              <strong>—</strong>
              <small>{label} · Not connected</small>
            </div>
          ))}
        </div>
        <p>
          {s.messages.filter((m) => m.kind === "Simulation").length} simulated
          messages are recorded separately. Simulations never count as delivery
          confirmations.
        </p>
        {action("analytics", "Review workspace activity")}
      </Panel>
    );
  if (page === "campaign-history" || page === "activity") {
    const rows = s.activities.filter(
      (a) => page === "activity" || a.campaignId,
    );
    return (
      <Panel
        title={
          page === "activity"
            ? "Contact activity history"
            : "Campaign execution history"
        }
        description="Saved workspace events. A simulation is not a provider execution."
        action={
          <button
            className="secondary"
            onClick={() =>
              download(
                "workspace-history.csv",
                toCsv([
                  ["time", "contact", "campaign", "event", "description"],
                  ...rows.map((r) => [
                    r.at,
                    s.contacts.find((c) => c.id === r.contactId)?.name,
                    s.campaigns.find((c) => c.id === r.campaignId)?.name,
                    r.kind,
                    r.description,
                  ]),
                ]),
                "text/csv",
              )
            }
          >
            Export history
          </button>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Contact</th>
                <th>Campaign</th>
                <th>Event</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.id}>
                  <td>{date(r.at)}</td>
                  <td>
                    {s.contacts.find((c) => c.id === r.contactId)?.name ||
                      "Workspace"}
                  </td>
                  <td>
                    {s.campaigns.find((c) => c.id === r.campaignId)?.name ||
                      "—"}
                  </td>
                  <td>
                    <Badge>{r.kind}</Badge>
                  </td>
                  <td>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>No recorded activity yet.</Empty>}
      </Panel>
    );
  }
  return <Empty>Choose a workspace module.</Empty>;
}
