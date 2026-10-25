"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import {
  uid,
  now,
  localContactSchema,
  resourceSchema,
  type LocalWorkspace,
} from "@/lib/local-workspace";
import {
  validateBooking,
  validatePublicUrl,
  addActivity,
  type Resource,
} from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue, date, download } from "./ui";
type Field = {
  key: string;
  label: string;
  type?: "textarea" | "number" | "url" | "datetime-local";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
};
type Definition = { title: string; description: string; fields: Field[] };
const definitions: Record<string, Definition> = {
  "lead-source": {
    title: "Lead sources & ads",
    description:
      "Configure source drafts and test sample ingestion. No ads run and no external source is connected.",
    fields: [
      {
        key: "provider",
        label: "Source",
        options: [
          "Meta Lead Ads",
          "Click-to-WhatsApp ads",
          "Google Sheets",
          "Website form",
          "Webhook",
        ],
      },
      { key: "url", label: "Public form / sheet URL", type: "url" },
      { key: "tag", label: "Tag new contacts" },
      { key: "campaign", label: "Campaign / ad context" },
      {
        key: "budget",
        label: "Daily ad budget preference (INR, draft)",
        type: "number",
        min: 0,
        max: 100000,
      },
    ],
  },
  "chat-agent": {
    title: "WhatsApp AI agent drafts",
    description:
      "Prepare instructions and knowledge. The local preview retrieves matching lines; no LLM or AI agent is running.",
    fields: [
      {
        key: "instructions",
        label: "Agent instructions",
        type: "textarea",
        required: true,
      },
      {
        key: "knowledge",
        label: "Knowledge notes (one answer per line)",
        type: "textarea",
        required: true,
      },
      { key: "handoff", label: "Human handoff instruction", required: true },
      { key: "greeting", label: "Greeting" },
    ],
  },
  form: {
    title: "WhatsApp forms",
    description:
      "Design a local lead form and test contact capture. Publishing inside WhatsApp requires Meta Flows integration.",
    fields: [
      { key: "description", label: "Form introduction", type: "textarea" },
      {
        key: "fields",
        label: "Additional question labels (one per line)",
        type: "textarea",
      },
      { key: "tag", label: "Tag captured contacts" },
      { key: "completion", label: "Completion message" },
    ],
  },
  product: {
    title: "Catalog & payment preparation",
    description:
      "Local catalog items only. Product synchronization, checkout and payments are disabled.",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "price",
        label: "Price (INR)",
        type: "number",
        min: 0,
        max: 10000000,
        required: true,
      },
      { key: "url", label: "Public product URL", type: "url" },
      { key: "sku", label: "SKU / reference" },
    ],
  },
  transfer: {
    title: "Human transfer requests",
    description:
      "Track local handoffs and reviewer notes. No telephone transfer occurs.",
    fields: [
      { key: "contactId", label: "Contact", options: [], required: true },
      { key: "owner", label: "Assigned teammate", required: true },
      {
        key: "reason",
        label: "Context / reason",
        type: "textarea",
        required: true,
      },
      {
        key: "status",
        label: "Local status",
        options: ["Pending", "In progress", "Resolved"],
      },
    ],
  },
  ivr: {
    title: "IVR menu drafts",
    description:
      "Draft digit routing and test it locally. No inbound phone number is connected.",
    fields: [
      {
        key: "greeting",
        label: "Welcome message",
        type: "textarea",
        required: true,
      },
      {
        key: "routes",
        label: "Digit = destination (one per line)",
        type: "textarea",
        required: true,
      },
      { key: "fallback", label: "Invalid digit response", required: true },
    ],
  },
  booking: {
    title: "Appointment bookings",
    description:
      "Local booking review with overlap checks. No calendar provider or confirmation delivery is connected.",
    fields: [
      { key: "contactId", label: "Contact", options: [], required: true },
      {
        key: "start",
        label: "Start (browser timezone)",
        type: "datetime-local",
        required: true,
      },
      {
        key: "end",
        label: "End (browser timezone)",
        type: "datetime-local",
        required: true,
      },
      {
        key: "status",
        label: "Local status",
        options: ["Tentative", "Confirmed", "Cancelled"],
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  sender: {
    title: "Email account setup",
    description:
      "Store non-secret sending preferences. OAuth and mailbox health require provider integration.",
    fields: [
      { key: "provider", label: "Provider", options: ["Gmail", "Zoho"] },
      { key: "address", label: "Sender email", required: true },
      {
        key: "limit",
        label: "Daily sending limit",
        type: "number",
        min: 1,
        max: 10000,
        required: true,
      },
      {
        key: "delay",
        label: "Delay between messages (seconds)",
        type: "number",
        min: 1,
        max: 3600,
        required: true,
      },
      {
        key: "region",
        label: "Zoho datacenter",
        options: [".com", ".in", ".eu", ".com.au"],
      },
    ],
  },
  identity: {
    title: "Email identities",
    description:
      "Prepare sender identity and domain records. No DNS validation or identity verification is performed here.",
    fields: [
      { key: "name", label: "From name", required: true },
      { key: "address", label: "From email", required: true },
      { key: "domain", label: "Sending domain", required: true },
      { key: "replyTo", label: "Reply-to email" },
      {
        key: "notes",
        label: "SPF / DKIM / DMARC preparation notes",
        type: "textarea",
      },
    ],
  },
};
export default function Resources({
  kind,
  notify,
}: {
  kind: Resource["kind"];
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const definition = definitions[kind];
  const [edit, setEdit] = useState<Resource | null | undefined>(),
    [preview, setPreview] = useState(""),
    [result, setResult] = useState(""),
    [showArchived, setShowArchived] = useState(false);
  if (!definition) return null;
  const rows = s.resources.filter(
      (r) => r.kind === kind && (showArchived || r.data.archived !== "true"),
    ),
    item = s.resources.find((r) => r.id === preview);
  const capture = (
    r: Resource,
    name: string,
    email: string,
    consent: boolean,
    phone = "",
    extra = "",
  ) => {
    const c = localContactSchema.parse({
      id: uid(),
      name,
      email,
      phone,
      company: "",
      stage: "New",
      tags: r.data.tag ? [r.data.tag] : [],
      consent,
      createdAt: now(),
      notes: extra,
    });
    if (
      s.contacts.some(
        (p) =>
          p.email.toLowerCase() === email.toLowerCase() ||
          (phone && p.phone === phone),
      )
    )
      throw Error("Duplicate contact: this email or phone is already present.");
    if (
      update((state) =>
        addActivity(
          { ...state, contacts: [...state.contacts, c] },
          c.id,
          `Local lead capture test · ${r.name}`,
          "contact",
        ),
      )
    )
      setResult(
        "Sample contact captured locally. No external source or form was published.",
      );
  };
  return (
    <>
      <Panel
        title={definition.title}
        description={definition.description}
        action={
          <button className="primary" onClick={() => setEdit(null)}>
            Create draft
          </button>
        }
      >
        <label className="console-check">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived drafts
        </label>
        <div className="console-card-grid">
          {rows.map((r) => (
            <article className="console-mini-card" key={r.id}>
              <Badge>
                {r.data.archived === "true"
                  ? "Archived"
                  : r.data.status || "Local draft"}
                {["sender", "identity", "lead-source"].includes(kind)
                  ? " · Not connected / verified"
                  : ""}
              </Badge>
              <h3>{r.name}</h3>
              <p>
                {r.data.description ||
                  r.data.reason ||
                  r.data.provider ||
                  r.data.greeting ||
                  r.data.instructions?.slice(0, 160) ||
                  r.data.notes ||
                  "Draft configuration"}
              </p>
              {kind === "product" && (
                <strong>
                  ₹{Number(r.data.price || 0).toLocaleString("en-IN")} · No
                  checkout
                </strong>
              )}
              {kind === "booking" && (
                <p>
                  {date(r.data.start)} – {date(r.data.end)}
                </p>
              )}
              <div className="console-actions">
                <button className="secondary" onClick={() => setEdit(r)}>
                  Edit
                </button>
                {["chat-agent", "form", "ivr", "lead-source"].includes(
                  kind,
                ) && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setPreview(r.id);
                      setResult("");
                    }}
                  >
                    Test locally
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    if (
                      update((state) => ({
                        ...state,
                        resources: state.resources.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                data: {
                                  ...x.data,
                                  archived:
                                    x.data.archived === "true"
                                      ? "false"
                                      : "true",
                                },
                                updatedAt: now(),
                              }
                            : x,
                        ),
                      }))
                    )
                      notify(
                        r.data.archived === "true"
                          ? "Draft restored"
                          : "Draft archived; use Show archived drafts to restore",
                      );
                  }}
                >
                  {r.data.archived === "true" ? "Restore" : "Archive"}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!rows.length && (
          <Empty>
            No drafts yet. Add a configuration to review and test locally.
          </Empty>
        )}
        {["sender", "identity"].includes(kind) && (
          <div className="console-notice">
            Connection status: Not connected. DNS status: Not checked. No
            credentials or API keys are collected here.
            <button className="secondary" disabled>
              Connect provider — integration phase
            </button>
          </div>
        )}
      </Panel>
      {edit !== undefined && (
        <Modal
          title={
            edit ? "Edit draft" : `New ${definition.title.toLowerCase()} draft`
          }
          close={() => setEdit(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget);
                const data: Record<string, string> = { ...(edit?.data || {}) };
                definition.fields.forEach(
                  (field) => (data[field.key] = formValue(f, field.key)),
                );
                for (const field of definition.fields) {
                  if (field.type === "url" && data[field.key])
                    data[field.key] = validatePublicUrl(data[field.key]);
                  if (
                    field.type === "number" &&
                    data[field.key] &&
                    (!Number.isFinite(Number(data[field.key])) ||
                      Number(data[field.key]) < (field.min || 0) ||
                      Number(data[field.key]) > (field.max || Infinity))
                  )
                    throw Error(`Invalid ${field.label}`);
                }
                for (const name of ["address", "replyTo"])
                  if (
                    data[name] &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[name])
                  )
                    throw Error("Use a valid email address");
                if (kind === "booking" && data.status !== "Cancelled")
                  validateBooking(s.resources, data, edit?.id);
                if (kind === "ivr") {
                  const lines = data.routes.split("\n").filter(Boolean);
                  const digits = lines.map((line) => line.split("=")[0].trim());
                  if (
                    !lines.length ||
                    lines.some(
                      (line) => !/^\s*[0-9#*]\s*=\s*\S.+$/.test(line),
                    ) ||
                    new Set(digits).size !== digits.length
                  )
                    throw Error(
                      "Use unique digits and destinations, for example 1 = Sales team",
                    );
                }
                const r = resourceSchema.parse({
                  id: edit?.id || uid(),
                  kind,
                  name: formValue(f, "draftName"),
                  data,
                  updatedAt: now(),
                });
                if (
                  update((state) => {
                    const next = {
                      ...state,
                      resources: edit
                        ? state.resources.map((x) => (x.id === r.id ? r : x))
                        : [...state.resources, r],
                    };
                    return kind === "transfer" && r.data.status !== "Resolved"
                      ? addActivity(
                          next,
                          r.data.contactId,
                          "Human transfer requested; pending outreach suppressed",
                          "handoff",
                        )
                      : next;
                  })
                ) {
                  setEdit(undefined);
                  notify("Local draft saved");
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            <label>
              Draft name
              <input
                name="draftName"
                required
                maxLength={120}
                defaultValue={edit?.name}
              />
            </label>
            {definition.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.key === "contactId" ? (
                  <select
                    name={field.key}
                    required={field.required}
                    defaultValue={edit?.data[field.key]}
                  >
                    <option value="">Choose contact</option>
                    {s.contacts.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : field.options ? (
                  <select name={field.key} defaultValue={edit?.data[field.key]}>
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    rows={4}
                    maxLength={30000}
                    required={field.required}
                    defaultValue={edit?.data[field.key]}
                  />
                ) : (
                  <input
                    name={field.key}
                    type={field.type || "text"}
                    min={field.min}
                    max={field.max}
                    step={field.key === "price" ? "0.01" : undefined}
                    maxLength={field.type === "url" ? 2000 : 200}
                    required={field.required}
                    defaultValue={edit?.data[field.key]}
                  />
                )}
              </label>
            ))}
            <button className="primary">Save local draft</button>
          </form>
        </Modal>
      )}
      {item && (
        <Modal title={`Local test · ${item.name}`} close={() => setPreview("")}>
          {kind === "form" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const f = new FormData(e.currentTarget);
                  capture(
                    item,
                    formValue(f, "name"),
                    formValue(f, "email"),
                    f.get("consent") === "on",
                    "",
                    item.data.fields
                      ?.split("\n")
                      .map((q, i) => `${q}: ${formValue(f, `extra-${i}`)}`)
                      .join("\n"),
                  );
                } catch (err) {
                  setResult((err as Error).message);
                }
              }}
            >
              <p>{item.data.description}</p>
              <label>
                Sample name
                <input name="name" required maxLength={120} />
              </label>
              <label>
                Sample email
                <input name="email" type="email" required />
              </label>
              {item.data.fields
                ?.split("\n")
                .filter(Boolean)
                .slice(0, 10)
                .map((q, i) => (
                  <label key={i}>
                    {q}
                    <input name={`extra-${i}`} maxLength={200} />
                  </label>
                ))}
              <label className="console-check">
                <input type="checkbox" name="consent" />
                Sample contact explicitly consents to outreach
              </label>
              <button className="primary">Test local form submission</button>
            </form>
          )}
          {kind === "lead-source" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const f = new FormData(e.currentTarget);
                  const payload = JSON.parse(formValue(f, "payload"));
                  if (typeof payload.consent !== "boolean")
                    throw Error(
                      "Payload consent must explicitly be true or false",
                    );
                  capture(
                    item,
                    payload.name,
                    payload.email,
                    payload.consent,
                    payload.phone || "",
                  );
                } catch (err) {
                  setResult((err as Error).message);
                }
              }}
            >
              <p>
                Paste a sample lead payload. This does not connect to{" "}
                {item.data.provider} or spend an ad budget.
              </p>
              <label>
                Sample JSON
                <textarea
                  name="payload"
                  required
                  rows={5}
                  maxLength={10000}
                  defaultValue={
                    '{\n  "name": "Sample lead",\n  "email": "lead@example.com",\n  "consent": false\n}'
                  }
                />
              </label>
              <button className="primary">Validate & capture locally</button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  download(
                    "sample-lead-payload.json",
                    JSON.stringify(
                      {
                        name: "Sample lead",
                        email: "lead@example.com",
                        consent: false,
                      },
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                Download sample payload
              </button>
            </form>
          )}
          {kind === "ivr" && (
            <>
              <p>{item.data.greeting}</p>
              <div className="console-dialpad">
                {"123456789*0#".split("").map((digit) => (
                  <button
                    key={digit}
                    className="secondary"
                    onClick={() => {
                      const route = item.data.routes
                        .split("\n")
                        .map((line) => line.split("=").map((x) => x.trim()))
                        .find(([key]) => key === digit);
                      setResult(
                        route
                          ? `Preview route: ${route[1]}. No call was transferred.`
                          : item.data.fallback,
                      );
                    }}
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </>
          )}
          {kind === "chat-agent" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const words = formValue(f, "message")
                  .toLowerCase()
                  .split(/\W+/)
                  .filter((w) => w.length > 3);
                const line = item.data.knowledge
                  .split("\n")
                  .find((line) =>
                    words.some((w) => line.toLowerCase().includes(w)),
                  );
                setResult(
                  line
                    ? `Local keyword match (not AI): ${line}`
                    : `No matching knowledge line. Handoff guidance: ${item.data.handoff}`,
                );
              }}
            >
              <p>{item.data.greeting || "Preview a knowledge response."}</p>
              <label>
                Test message
                <input name="message" required maxLength={1000} />
              </label>
              <button className="primary">Preview keyword retrieval</button>
            </form>
          )}
          <p className="console-notice" role="status" aria-live="polite">
            {result || "No local test run yet."}
          </p>
        </Modal>
      )}
    </>
  );
}
