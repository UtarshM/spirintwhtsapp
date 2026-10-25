"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import {
  localContactSchema,
  uid,
  now,
  toCsv,
  type LocalContact,
} from "@/lib/local-workspace";
import { addActivity, audience, leadStatuses } from "@/lib/outreach";
import { parseContactCsv } from "@/lib/csv";
import {
  Panel,
  Empty,
  Badge,
  Modal,
  SearchBox,
  download,
  formValue,
  date,
} from "./ui";
export default function Contacts({
  qualified = false,
  segments = false,
  notify,
}: {
  qualified?: boolean;
  segments?: boolean;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [query, setQuery] = useState(""),
    [edit, setEdit] = useState<LocalContact | null | undefined>(),
    [segment, setSegment] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof parseContactCsv> | null>(
      null,
    );
  const selectedSegment = s.resources.find((r) => r.id === segment);
  const people = (
    selectedSegment ? audience(s, selectedSegment.data) : s.contacts
  ).filter(
    (c) =>
      (!qualified || c.stage === "Qualified") &&
      `${c.name} ${c.company} ${c.email} ${c.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const [segmentModal, setSegmentModal] = useState(false);
  return (
    <>
      <Panel
        title={
          segments
            ? "Saved audiences"
            : qualified
              ? "Qualified leads"
              : "Contacts"
        }
        description="Local sample contacts · Consent is never inferred from an import."
        action={
          <div className="console-actions">
            <button className="secondary" onClick={() => setSegmentModal(true)}>
              New segment
            </button>
            <label className="secondary console-file">
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2000000) throw Error("Maximum 2 MB");
                      setPreview(
                        parseContactCsv(await file.text(), s.contacts),
                      );
                    }
                  } catch (err) {
                    notify((err as Error).message);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <button className="primary" onClick={() => setEdit(null)}>
              Add contact
            </button>
          </div>
        }
      >
        <div className="console-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search contacts"
          />
          <select
            aria-label="Audience segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            <option value="">All contacts</option>
            {s.resources
              .filter((r) => r.kind === "segment")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({audience(s, r.data).length})
                </option>
              ))}
          </select>
          <button
            className="secondary"
            onClick={() =>
              download(
                "sprint-sample-contacts.csv",
                toCsv([
                  [
                    "name",
                    "company",
                    "email",
                    "phone",
                    "consent",
                    "status",
                    "tags",
                  ],
                  ...people.map((c) => [
                    c.name,
                    c.company,
                    c.email,
                    c.phone,
                    c.consent,
                    c.stage,
                    c.tags.join(","),
                  ]),
                ]),
                "text/csv",
              )
            }
          >
            Export filtered CSV
          </button>
        </div>
        {segments && (
          <div className="console-card-grid">
            {s.resources
              .filter((r) => r.kind === "segment")
              .map((r) => (
                <article className="console-mini-card" key={r.id}>
                  <h3>{r.name}</h3>
                  <p>{audience(s, r.data).length} matching contacts</p>
                  <small>
                    {Object.values(r.data).filter(Boolean).join(" · ") ||
                      "All contacts"}
                  </small>
                  <button
                    className="text-button"
                    onClick={() => setSegment(r.id)}
                  >
                    Review audience
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (
                        update((current) => ({
                          ...current,
                          resources: current.resources.filter(
                            (x) => x.id !== r.id,
                          ),
                        }))
                      )
                        notify("Local segment removed");
                    }}
                  >
                    Remove segment
                  </button>
                </article>
              ))}
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Lead status</th>
                <th>Audience tags</th>
                <th>Consent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {people.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.company}</small>
                  </td>
                  <td>
                    {c.email}
                    <small>{c.phone}</small>
                  </td>
                  <td>
                    <Badge>{c.stage}</Badge>
                  </td>
                  <td>{c.tags.join(", ") || "—"}</td>
                  <td>
                    <Badge>
                      {c.optedOut
                        ? "Opted out"
                        : c.consent
                          ? "Recorded"
                          : "Not recorded"}
                    </Badge>
                  </td>
                  <td>
                    <button className="secondary" onClick={() => setEdit(c)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!people.length && (
          <Empty>
            No matching contacts. Change your filters or add a sample contact.
          </Empty>
        )}
        <p>{people.length} contacts · Local data only</p>
      </Panel>
      {preview && (
        <Modal title="Review CSV import" close={() => setPreview(null)}>
          <p>
            {preview.contacts.length} valid new contacts · {preview.duplicates}{" "}
            duplicates skipped · {preview.errors.length} invalid rows
          </p>
          <p>
            Required columns: name,email. Optional: company,phone,consent. Only
            consent=true records consent.
          </p>
          {preview.errors.length > 0 && <pre>{preview.errors.join("\n")}</pre>}
          <ul>
            {preview.contacts.slice(0, 8).map((c) => (
              <li key={c.id}>
                {c.name} — {c.email} — consent{" "}
                {c.consent ? "recorded" : "not recorded"}
              </li>
            ))}
          </ul>
          <button
            className="primary"
            disabled={!preview.contacts.length}
            onClick={() => {
              const data = preview.contacts;
              if (
                update((current) => ({
                  ...current,
                  contacts: [
                    ...current.contacts,
                    ...data.map((c) =>
                      localContactSchema.parse({ ...c, createdAt: now() }),
                    ),
                  ],
                }))
              ) {
                notify("Valid rows imported locally");
                setPreview(null);
              }
            }}
          >
            Import valid rows
          </button>
        </Modal>
      )}
      {segmentModal && (
        <Modal
          title="Create audience segment"
          close={() => setSegmentModal(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                update((current) => ({
                  ...current,
                  resources: [
                    ...current.resources,
                    {
                      id: uid(),
                      kind: "segment",
                      name: formValue(f, "name"),
                      data: {
                        query: formValue(f, "query"),
                        tag: formValue(f, "tag"),
                        stage: formValue(f, "stage"),
                        consent: formValue(f, "consent"),
                      },
                      updatedAt: now(),
                    },
                  ],
                }))
              ) {
                setSegmentModal(false);
                notify("Segment saved; audience updates with your contacts");
              }
            }}
          >
            <label>
              Segment name
              <input name="name" required maxLength={120} />
            </label>
            <label>
              Name, company or email contains
              <input name="query" maxLength={100} />
            </label>
            <label>
              Has tag
              <input name="tag" maxLength={100} />
            </label>
            <label>
              Lead status
              <select name="stage">
                <option value="">Any</option>
                {leadStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Require consent
              <select name="consent">
                <option value="">Any</option>
                <option>Yes</option>
              </select>
            </label>
            <button className="primary">Save segment</button>
          </form>
        </Modal>
      )}
      {edit !== undefined && (
        <Modal
          title={edit ? "Contact details" : "New contact"}
          close={() => setEdit(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const f = new FormData(e.currentTarget);
                const contact = localContactSchema.parse({
                  ...(edit || {}),
                  id: edit?.id || uid(),
                  name: formValue(f, "name"),
                  company: formValue(f, "company"),
                  email: formValue(f, "email"),
                  phone: formValue(f, "phone"),
                  stage: formValue(f, "stage"),
                  tags: formValue(f, "tags")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                  consent: f.get("consent") === "on",
                  optedOut: f.get("optedOut") === "on",
                  owner: formValue(f, "owner"),
                  notes: formValue(f, "notes"),
                  createdAt: edit?.createdAt || now(),
                });
                if (contact.phone && !/^\+[1-9]\d{7,14}$/.test(contact.phone))
                  throw Error(
                    "Use an international phone number, such as +919876543210",
                  );
                if (
                  s.contacts.some(
                    (c) =>
                      c.id !== contact.id &&
                      ((contact.email &&
                        c.email.toLowerCase() ===
                          contact.email.toLowerCase()) ||
                        (contact.phone && c.phone === contact.phone)),
                  )
                )
                  throw Error(
                    "A contact with this email or phone already exists",
                  );
                if (
                  update((current) =>
                    addActivity(
                      {
                        ...current,
                        contacts: edit
                          ? current.contacts.map((c) =>
                              c.id === contact.id ? contact : c,
                            )
                          : [...current.contacts, contact],
                      },
                      contact.id,
                      edit
                        ? "Contact updated locally"
                        : "Contact added locally",
                      contact.optedOut ? "opt_out" : "contact",
                    ),
                  )
                ) {
                  setEdit(undefined);
                  notify("Contact saved locally");
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            <div className="console-form-grid">
              <label>
                Name
                <input
                  name="name"
                  required
                  defaultValue={edit?.name}
                  maxLength={120}
                />
              </label>
              <label>
                Company
                <input
                  name="company"
                  defaultValue={edit?.company}
                  maxLength={200}
                />
              </label>
              <label>
                Email
                <input name="email" type="email" defaultValue={edit?.email} />
              </label>
              <label>
                International phone
                <input
                  name="phone"
                  defaultValue={edit?.phone}
                  placeholder="+91…"
                />
              </label>
            </div>
            <label>
              Lead status
              <select name="stage" defaultValue={edit?.stage || "New"}>
                {leadStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Owner
              <select
                name="owner"
                defaultValue={edit?.owner || "Scalezix team"}
              >
                {s.team.map((t) => (
                  <option key={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label>
              Tags (comma separated)
              <input
                name="tags"
                defaultValue={edit?.tags.join(", ")}
                maxLength={1000}
              />
            </label>
            <label>
              Notes
              <textarea
                name="notes"
                rows={3}
                maxLength={10000}
                defaultValue={edit?.notes}
              />
            </label>
            <label className="console-check">
              <input
                name="consent"
                type="checkbox"
                defaultChecked={edit?.consent}
              />
              Consent has actually been recorded
            </label>
            <label className="console-check">
              <input
                name="optedOut"
                type="checkbox"
                defaultChecked={edit?.optedOut}
              />
              Opted out — exclude from outreach
            </label>
            <button className="primary">Save contact</button>
          </form>
          {edit && (
            <>
              <h3 className="console-subtitle">Unified activity timeline</h3>
              <ul className="console-timeline">
                {[
                  ...s.activities
                    .filter((a) => a.contactId === edit.id)
                    .map((a) => ({ at: a.at, text: a.description })),
                  ...s.messages
                    .filter((m) => m.contactId === edit.id)
                    .map((m) => ({
                      at: m.at,
                      text: `${m.kind} · ${m.channel} · ${m.direction}: ${m.body}`,
                    })),
                ]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .map((a, i) => (
                    <li key={i}>
                      <small>{date(a.at)}</small>
                      {a.text}
                    </li>
                  ))}
              </ul>
              <button
                className="secondary"
                onClick={() => {
                  if (
                    update((current) => ({
                      ...current,
                      tasks: [
                        ...current.tasks,
                        {
                          id: uid(),
                          contactId: edit.id,
                          title: `Follow up with ${edit.name}`,
                          dueAt: now(),
                          done: false,
                        },
                      ],
                    }))
                  )
                    notify("Follow-up added to Qualified Leads → Tasks");
                }}
              >
                Create follow-up task
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
