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
import {
  addActivity,
  audience,
  leadStatuses,
  type Resource,
} from "@/lib/outreach";
import {
  parseContactCsv,
  inspectContactCsv,
  parseMappedContactCsv,
  contactImportFields,
  type ContactColumnMapping,
} from "@/lib/csv";
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
  advanced = false,
  notify,
}: {
  qualified?: boolean;
  segments?: boolean;
  advanced?: boolean;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [query, setQuery] = useState(""),
    [edit, setEdit] = useState<LocalContact | null | undefined>(),
    [segment, setSegment] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof parseContactCsv> | null>(
      null,
    );
  const [crmSubTab, setCrmSubTab] = useState<string>("Leads");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>("");
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string>("");

  const selectedSegment = s.resources.find((r) => r.id === segment);
  const people = audience(
    {
      ...s,
      contacts: selectedSegment
        ? audience(s, selectedSegment.data)
        : s.contacts,
    },
    filters,
  ).filter(
    (c) =>
      (!qualified || c.stage === "Qualified") &&
      (!selectedChannelFilter ||
        (selectedChannelFilter === "Calls" ? !!c.phone :
         selectedChannelFilter === "WhatsApp" ? !!c.phone :
         selectedChannelFilter === "Email" ? !!c.email : true)) &&
      (!selectedOutcomeFilter || c.tags.includes(selectedOutcomeFilter)) &&
      `${c.name} ${c.company} ${c.email} ${c.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const [segmentModal, setSegmentModal] = useState(false),
    [editSegment, setEditSegment] = useState<Resource | null>(null),
    [csvSource, setCsvSource] = useState(""),
    [mapping, setMapping] = useState<ContactColumnMapping>({
      name: "",
      email: "",
      phone: "",
      company: "",
      consent: "",
    });
  const csv = csvSource ? inspectContactCsv(csvSource) : null;

  const totalContactsCount = s.contacts.length;
  const consentedCount = s.contacts.filter((c) => c.consent && !c.optedOut).length;
  const qualifiedCount = s.contacts.filter((c) => c.stage === "Qualified").length;
  const totalValue = s.contacts
    .filter((c) => (!qualified || c.stage === "Qualified"))
    .reduce((sum, c) => sum + (c.value || 0), 0);

  const RAPID_OUTCOMES = [
    "Demo Booked",
    "Callback Requested",
    "Interested — Info",
    "Objection — Price",
    "Objection — Time",
    "Objection — Existing",
    "Not Interested",
    "No Response",
    "Wrong Number",
    "Completed",
    "Voicemail",
    "Call Failed",
    "Interested",
    "Rejected",
    "Follow Up",
    "Neutral",
    "Busy",
    "No Answer",
    "Failed",
  ];

  return (
    <>
      <Panel
        title={
          segments
            ? "Audience · Segments & Lists"
            : qualified
              ? "Leads · Qualified CRM Hub"
              : "Audience · Contacts Roster"
        }
        description={
          segments
            ? "Dynamic audience groups filtered by channel availability, tags, and consent status."
            : qualified
              ? "Verified high-intent leads qualified by AI Voice calling dialogues, WhatsApp interactions, and forms."
              : "Comprehensive customer directory with multi-channel reachability and consent tracking."
        }
        action={
          <div className="console-actions">
            <button
              className="secondary"
              onClick={() => {
                setEditSegment(null);
                setSegmentModal(true);
              }}
            >
              New segment
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                download(
                  "leadpilot-contacts-template.csv",
                  "name,email,phone,company,stage,consent\nRahul Sharma,rahul@example.com,+919876543210,Apex Global,New,true\nPooja Patel,pooja@example.com,+919876543211,Nexus Corp,Interested,true",
                  "text/csv",
                )
              }
            >
              Sample CSV
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
                      const source = await file.text();
                      const inspected = inspectContactCsv(source);
                      setMapping(inspected.mapping);
                      setCsvSource(source);
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
      {/* Leadpilot Subtabs for Qualified Leads */}
      {qualified && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          {[
            "Leads",
            "Manual Leads",
            "Auto-Assign",
            "Alerts",
            "Buckets",
            "Custom outcomes",
            "Export Excel",
          ].map((tab) => (
            <button
              key={tab}
              type="button"
              className={crmSubTab === tab ? "primary" : "secondary"}
              style={{ padding: "6px 14px", fontSize: 13, borderRadius: 20 }}
              onClick={() => {
                setCrmSubTab(tab);
                if (tab === "Export Excel") {
                  download(
                    "qualified-leads-export.csv",
                    toCsv([
                      ["Name", "Company", "Email", "Phone", "Stage", "Value", "Tags", "Owner"],
                      ...s.contacts
                        .filter((c) => c.stage === "Qualified")
                        .map((c) => [c.name, c.company, c.email, c.phone, c.stage, c.value || 0, c.tags.join(";"), c.owner]),
                    ]),
                    "text/csv",
                  );
                  notify("Exporting qualified leads CSV");
                }
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Top Stat Cards Banner */}
      <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
        {qualified ? (
          <>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">QUALIFIED LEADS</span>
              <div className="rapid-stat-value">{qualifiedCount}</div>
              <span className="rapid-stat-sub">High-intent confirmed opportunities</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">PIPELINE VALUE</span>
              <div className="rapid-stat-value">₹{totalValue.toLocaleString("en-IN")}</div>
              <span className="rapid-stat-sub">Estimated opportunity revenue</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">ACTIVE CONSENT</span>
              <div className="rapid-stat-value">{consentedCount}</div>
              <span className="rapid-stat-sub">Legally compliant for automated reach</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">QUALIFICATION RATIO</span>
              <div className="rapid-stat-value">
                {totalContactsCount > 0 ? `${Math.round((qualifiedCount / totalContactsCount) * 100)}%` : "0%"}
              </div>
              <span className="rapid-stat-sub">From {totalContactsCount} total workspace contacts</span>
            </div>
          </>
        ) : segments ? (
          <>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">TOTAL LISTS / SEGMENTS</span>
              <div className="rapid-stat-value">{s.resources.filter((r) => r.kind === "segment").length}</div>
              <span className="rapid-stat-sub">Saved targeting criteria</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">TOTAL CONTACTS</span>
              <div className="rapid-stat-value">{totalContactsCount}</div>
              <span className="rapid-stat-sub">Unique audience records</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">CONSENTED AUDIENCE</span>
              <div className="rapid-stat-value">{consentedCount}</div>
              <span className="rapid-stat-sub">Available for outreach</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">QUALIFIED CUSTOMERS</span>
              <div className="rapid-stat-value">{qualifiedCount}</div>
              <span className="rapid-stat-sub">High-intent prospects</span>
            </div>
          </>
        ) : (
          <>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">TOTAL CONTACTS</span>
              <div className="rapid-stat-value">{totalContactsCount}</div>
              <span className="rapid-stat-sub">Roster size</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">CONSENT RECORDED</span>
              <div className="rapid-stat-value">{consentedCount}</div>
              <span className="rapid-stat-sub">Explicit opt-ins</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">OPTED OUT</span>
              <div className="rapid-stat-value">{s.contacts.filter((c) => c.optedOut).length}</div>
              <span className="rapid-stat-sub">Suppressed from messaging</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">TOTAL PIPELINE</span>
              <div className="rapid-stat-value">₹{totalValue.toLocaleString("en-IN")}</div>
              <span className="rapid-stat-sub">Pipeline value</span>
            </div>
          </>
        )}
      </div>

      {/* Toolbar with Channel Filters and Outcome Selectors */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { id: "", label: "All Channels" },
            { id: "Calls", label: "📞 Calls" },
            { id: "WhatsApp", label: "💬 WhatsApp" },
            { id: "Email", label: "✉️ Email" },
          ].map((ch) => (
            <button
              key={ch.id}
              type="button"
              className={selectedChannelFilter === ch.id ? "primary" : "secondary"}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 20 }}
              onClick={() => setSelectedChannelFilter(ch.id)}
            >
              {ch.label}
            </button>
          ))}

          {qualified && (
            <select
              value={selectedOutcomeFilter}
              onChange={(e) => setSelectedOutcomeFilter(e.target.value)}
              style={{ height: 34, borderRadius: 20, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 12, background: "#fff" }}
            >
              <option value="">All Outcomes (19 Tags)</option>
              {RAPID_OUTCOMES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={qualified ? "Search qualified leads..." : "Search contacts..."}
          />
          <select
            aria-label="Audience segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            style={{ height: 36, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 13 }}
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
            Export CSV
          </button>
        </div>
      </div>
        <details className="console-filter-panel" open={advanced || undefined}>
          <summary>Advanced contact filters</summary>
          <div className="console-form-grid">
            {(
              [
                ["stage", "Lead status", leadStatuses],
                [
                  "owner",
                  "Owner",
                  [...new Set(s.contacts.map((c) => c.owner))],
                ],
                ["consent", "Consent", ["Yes", "No", "Opted out"]],
                ["address", "Available channel", ["Email", "Phone"]],
                ["tag", "Tag", [...new Set(s.contacts.flatMap((c) => c.tags))]],
              ] as [string, string, string[]][]
            ).map(([key, label, values]) => (
              <label key={key}>
                {label}
                <select
                  value={filters[key] || ""}
                  onChange={(e) =>
                    setFilters((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                >
                  <option value="">Any</option>
                  {values.filter(Boolean).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Created on or after
              <input
                type="date"
                value={filters.createdAfter || ""}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    createdAfter: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="console-actions">
            <button className="secondary" onClick={() => setFilters({})}>
              Clear filters
            </button>
            <button
              className="secondary"
              onClick={() => {
                setEditSegment({
                  id: "",
                  kind: "segment",
                  name: "",
                  data: { ...filters, query },
                  updatedAt: now(),
                });
                setSegmentModal(true);
              }}
            >
              Save filters as segment
            </button>
            <span>{people.length} matching contacts</span>
          </div>
        </details>
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
                      setEditSegment(r);
                      setSegmentModal(true);
                    }}
                  >
                    Edit segment
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                {qualified ? (
                  <>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>CONTACT</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>CHANNEL</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>BUCKET</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>OUTCOME</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>STATUS</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>ACTION</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>AUTO-CALL</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>SOURCE</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>CAMPAIGN</th>
                    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>LAST CALL</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Lead Name</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Contact Info</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Status</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Tags / Intent</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Consent</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {people.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {qualified ? (
                    <>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{c.phone || c.email}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#4338ca", background: "#e0e7ff", padding: "3px 8px", borderRadius: 4 }}>
                          {c.phone ? "📞 Calls" : "✉️ Email"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#166534", background: "#dcfce7", padding: "3px 8px", borderRadius: 4 }}>
                          High Intent
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: 20 }}>
                          {c.tags[0] || "Interested"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge>{c.stage}</Badge>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button className="primary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEdit(c)}>
                          Call Now
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#059669", fontWeight: 600 }}>
                        ● Enabled
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>
                        {c.tags.includes("meta") ? "Meta Ads" : "Manual"}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>
                        Direct Outreach
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>
                        {c.createdAt ? date(c.createdAt) : "Today"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{c.company || "Independent"}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, color: "#1e293b" }}>{c.email || "No email"}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{c.phone || "No phone"}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              c.stage === "Qualified"
                                ? "#ecfdf5"
                                : c.stage === "Engaged"
                                  ? "#eff6ff"
                                  : "#f1f5f9",
                            color:
                              c.stage === "Qualified"
                                ? "#059669"
                                : c.stage === "Engaged"
                                  ? "#2563eb"
                                  : "#64748b",
                          }}
                        >
                          {c.stage}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {c.tags.length > 0 ? (
                            c.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                }}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge>
                          {c.optedOut
                            ? "Opted out"
                            : c.consent
                              ? "Recorded"
                              : "Not recorded"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button className="secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEdit(c)}>
                          Details
                        </button>
                      </td>
                    </>
                  )}
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
      {csv && (
        <Modal title="Map CSV columns" close={() => setCsvSource("")}>
          <p>
            {csv.rows.length} source rows. Map your columns, then review
            validation and duplicates before importing. Consent is recorded only
            for an explicit true value.
          </p>
          <div className="console-form-grid">
            {contactImportFields.map((field) => (
              <label key={field}>
                {field}
                {field === "name" || field === "email"
                  ? " (required)"
                  : " (optional)"}
                <select
                  value={mapping[field]}
                  onChange={(e) =>
                    setMapping((current) => ({
                      ...current,
                      [field]: e.target.value,
                    }))
                  }
                >
                  <option value="">Do not import</option>
                  {csv.headers.map((header, i) => (
                    <option key={i} value={String(i)}>
                      {header || `Column ${i + 1}`} · Column {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <h3>Source preview</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {csv.headers.map((h, i) => (
                    <th key={i}>{h || `Column ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.sample.map((row, i) => (
                  <tr key={i}>
                    {csv.headers.map((_, j) => (
                      <td key={j}>{row[j] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="primary"
            onClick={() => {
              try {
                setPreview(
                  parseMappedContactCsv(csvSource, mapping, s.contacts),
                );
                setCsvSource("");
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            Review mapped import
          </button>
        </Modal>
      )}
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
          title={
            editSegment?.id
              ? "Edit audience segment"
              : "Create audience segment"
          }
          close={() => setSegmentModal(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const resource: Resource = {
                id: editSegment?.id || uid(),
                kind: "segment",
                name: formValue(f, "name"),
                data: {
                  ...editSegment?.data,
                  query: formValue(f, "query"),
                  tag: formValue(f, "tag"),
                  stage: formValue(f, "stage"),
                  consent: formValue(f, "consent"),
                },
                updatedAt: now(),
              };
              if (
                update((current) => ({
                  ...current,
                  resources: editSegment?.id
                    ? current.resources.map((r) =>
                        r.id === resource.id ? resource : r,
                      )
                    : [...current.resources, resource],
                }))
              ) {
                setSegmentModal(false);
                notify("Segment saved; audience updates with your contacts");
              }
            }}
          >
            <label>
              Segment name
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={editSegment?.name}
              />
            </label>
            <label>
              Name, company or email contains
              <input
                name="query"
                maxLength={100}
                defaultValue={editSegment?.data.query}
              />
            </label>
            <label>
              Has tag
              <input
                name="tag"
                maxLength={100}
                defaultValue={editSegment?.data.tag}
              />
            </label>
            <label>
              Lead status
              <select name="stage" defaultValue={editSegment?.data.stage || ""}>
                <option value="">Any</option>
                {leadStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Require consent
              <select
                name="consent"
                defaultValue={editSegment?.data.consent || ""}
              >
                <option value="No">Not recorded</option>
                <option value="Opted out">Opted out</option>
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
                const rawPhone = formValue(f, "phone").replace(/[\s\-\(\)]/g, "");
                const dialCode = formValue(f, "dialCode") || "+91";
                let normalizedPhone = rawPhone;
                if (rawPhone && !rawPhone.startsWith("+")) {
                  normalizedPhone = `${dialCode}${rawPhone.replace(/^0+/, "")}`;
                }

                const contact = localContactSchema.parse({
                  ...(edit || {}),
                  id: edit?.id || uid(),
                  name: formValue(f, "name"),
                  company: formValue(f, "company"),
                  email: formValue(f, "email"),
                  phone: normalizedPhone,
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
                Phone (with Country Dial Code)
                <div style={{ display: "flex", gap: 6 }}>
                  <select name="dialCode" defaultValue="+91" style={{ width: 100, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 6px", fontSize: 13 }}>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>
                  <input
                    name="phone"
                    defaultValue={edit?.phone?.replace(/^\+\d{1,4}/, "") || edit?.phone}
                    placeholder="10-digit number e.g. 9876543210"
                    style={{ flex: 1 }}
                  />
                </div>
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
                defaultValue={edit?.owner || "Leadpilot team"}
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
