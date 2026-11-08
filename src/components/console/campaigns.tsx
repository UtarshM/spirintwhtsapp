"use client";
import { useState } from "react";
import TemplatePreview from "./template-preview";
import { useWorkspace } from "../local-provider";
import {
  uid,
  now,
  balance,
  eligibleContacts,
  validateCampaign,
  simulationRates,
  personalizeTemplate,
  type Channel,
  type LocalCampaign,
} from "@/lib/local-workspace";
import { audience, runCampaign } from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue, date, SearchBox } from "./ui";
import {
  Phone,
  MessageSquare,
  Mail,
  Sparkles,
  CheckCircle2,
  User,
  PhoneCall,
  Filter,
  Check,
  ChevronDown,
} from "lucide-react";

const RAPID_LEAD_OUTCOMES = [
  "INTERESTED",
  "FOLLOW UP",
  "NOT INTERESTED",
  "REJECTED",
  "NO RESPONSE",
  "NEUTRAL",
  "UNCLASSIFIED",
  "OPTED OUT",
] as const;

export default function Campaigns({
  channel,
  initialStatus = "",
  view = "campaigns",
  notify,
  navigate,
}: {
  channel?: Channel;
  initialStatus?: string;
  view?: "campaigns" | "leads";
  notify: (s: string) => void;
  navigate?: (page: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<LocalCampaign | null | undefined>(),
    [detail, setDetail] = useState(""),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState(initialStatus),
    [selected, setSelected] = useState<string[]>([]),
    [kind, setKind] = useState<Channel>(channel || "WhatsApp"),
    [noSequenceModalOpen, setNoSequenceModalOpen] = useState(false);

  // Lead-specific filters
  const [leadOutcomeFilter, setLeadOutcomeFilter] = useState<string>("");
  const [leadCampaignFilter, setLeadCampaignFilter] = useState<string>("");
  const [leadChannelFilter, setLeadChannelFilter] = useState<string>("");
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>("");
  const current = s.campaigns.find((c) => c.id === detail);
  const list = s.campaigns.filter(
    (c) =>
      (!channel || c.channel === channel) &&
      (!statusFilter || c.status === statusFilter) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const open = (c: LocalCampaign | null) => {
    if (!c && s.sequences.length === 0) {
      setNoSequenceModalOpen(true);
      return;
    }
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
  const totalCount = s.campaigns.length;
  const activeCount = s.campaigns.filter((c) => c.status === "Scheduled").length;
  const completedCount = s.campaigns.filter((c) => c.status === "Completed").length;
  const pausedCount = s.campaigns.filter((c) => c.status === "Paused").length;

  const [activeChannelTab, setActiveChannelTab] = useState<string>(channel || "");

  const filteredList = s.campaigns.filter(
    (c) =>
      (!activeChannelTab || c.channel === activeChannelTab) &&
      (!statusFilter || c.status === statusFilter) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Helper for lead outcomes
  const getLeadOutcome = (contact: (typeof s.contacts)[number]): string => {
    if (contact.optedOut) return "OPTED OUT";
    for (const tag of contact.tags) {
      const upper = tag.toUpperCase();
      if (upper.includes("INTEREST") || upper.includes("DEMO") || upper.includes("BOOKED")) return "INTERESTED";
      if (upper.includes("FOLLOW") || upper.includes("CALLBACK")) return "FOLLOW UP";
      if (upper.includes("NOT INTERESTED") || upper.includes("REJECT") || upper.includes("PRICE")) return "NOT INTERESTED";
      if (upper.includes("WRONG") || upper.includes("INVALID") || upper.includes("BOUNCE")) return "REJECTED";
      if (upper.includes("NO ANSWER") || upper.includes("BUSY") || upper.includes("NO RESPONSE") || upper.includes("VOICEMAIL")) return "NO RESPONSE";
      if (upper.includes("NEUTRAL")) return "NEUTRAL";
    }
    if (contact.stage === "Qualified") return "INTERESTED";
    if (contact.stage === "Engaged") return "FOLLOW UP";
    if (contact.stage === "Archived") return "REJECTED";
    return "UNCLASSIFIED";
  };

  const allLeads = s.contacts.map((contact) => {
    const associatedCampaigns = s.campaigns.filter((c) => c.contactIds.includes(contact.id));
    const primaryCampaign = associatedCampaigns[0] || (s.campaigns.length ? s.campaigns[0] : undefined);
    const lastMessage = s.messages.filter((m) => m.contactId === contact.id).slice(-1)[0];
    const lastCall = s.calls.filter((c) => c.contactId === contact.id).slice(-1)[0];
    const outcome = getLeadOutcome(contact);
    const channelName = primaryCampaign?.channel || (lastCall ? "AI calling" : lastMessage?.channel || (contact.phone ? "WhatsApp" : "Email"));
    const engagement = contact.optedOut ? "Opted Out" : lastCall?.duration ? "Call Answered" : lastMessage?.direction === "inbound" ? "Replied" : (lastMessage ? "Delivered" : "Pending");
    const lastContactedAt = lastCall?.at || lastMessage?.at || contact.createdAt;
    return {
      contact,
      campaign: primaryCampaign,
      channel: channelName,
      outcome,
      engagement,
      lastContactedAt,
    };
  });

  const leadOutcomeCounts = RAPID_LEAD_OUTCOMES.reduce<Record<string, number>>((acc, out) => {
    acc[out] = allLeads.filter((l) => l.outcome === out).length;
    return acc;
  }, {});

  const filteredLeads = allLeads.filter((lead) => {
    const matchesOutcome = !leadOutcomeFilter || lead.outcome === leadOutcomeFilter;
    const matchesCampaign = !leadCampaignFilter || lead.campaign?.id === leadCampaignFilter;
    const matchesChannel = !leadChannelFilter || lead.channel === leadChannelFilter;
    const matchesSearch =
      !leadSearchQuery ||
      lead.contact.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.contact.company.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.contact.email.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      (lead.contact.phone && lead.contact.phone.includes(leadSearchQuery));
    return matchesOutcome && matchesCampaign && matchesChannel && matchesSearch;
  });

  const handleUpdateLeadOutcome = (contactId: string, newOutcome: string) => {
    const updated = update((state) => ({
      ...state,
      contacts: state.contacts.map((c) => {
        if (c.id !== contactId) return c;
        const cleanedTags = c.tags.filter((t) => !RAPID_LEAD_OUTCOMES.some((ro) => ro.toLowerCase() === t.toLowerCase()));
        return {
          ...c,
          tags: [...cleanedTags, newOutcome],
          stage: newOutcome === "INTERESTED" ? "Qualified" : newOutcome === "FOLLOW UP" ? "Engaged" : c.stage,
          optedOut: newOutcome === "OPTED OUT" ? true : c.optedOut,
        };
      }),
    }));
    if (updated) notify(`Lead outcome updated to ${newOutcome}`);
  };

  // Dedicated RapidSales "Campaign Leads" View
  if (view === "leads") {
    return (
      <Panel
        title="Campaign Leads"
        description="Review audience responses, track delivery and engagement outcomes across your active campaigns."
      >
        {/* Top Metric Cards */}
        <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">TOTAL AUDIENCE</span>
            <div className="rapid-stat-value">{allLeads.length}</div>
            <span className="rapid-stat-sub">Across all campaigns</span>
          </div>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">INTERESTED / REPLIED</span>
            <div className="rapid-stat-value" style={{ color: "#059669" }}>
              {leadOutcomeCounts["INTERESTED"] || 0}
            </div>
            <span className="rapid-stat-sub">High buying intent</span>
          </div>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">FOLLOW UP</span>
            <div className="rapid-stat-value" style={{ color: "#d97706" }}>
              {leadOutcomeCounts["FOLLOW UP"] || 0}
            </div>
            <span className="rapid-stat-sub">Requires follow-up action</span>
          </div>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">NO RESPONSE / UNREACHED</span>
            <div className="rapid-stat-value" style={{ color: "#64748b" }}>
              {(leadOutcomeCounts["NO RESPONSE"] || 0) + (leadOutcomeCounts["UNCLASSIFIED"] || 0)}
            </div>
            <span className="rapid-stat-sub">Pending customer response</span>
          </div>
        </div>

        {/* RapidSales Outcome Filter Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            type="button"
            className={!leadOutcomeFilter ? "primary" : "secondary"}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 20 }}
            onClick={() => setLeadOutcomeFilter("")}
          >
            ALL ({allLeads.length})
          </button>
          {RAPID_LEAD_OUTCOMES.map((out) => {
            const count = leadOutcomeCounts[out] || 0;
            const isSelected = leadOutcomeFilter === out;
            return (
              <button
                key={out}
                type="button"
                className={isSelected ? "primary" : "secondary"}
                style={{ padding: "5px 12px", fontSize: 12, borderRadius: 20 }}
                onClick={() => setLeadOutcomeFilter(isSelected ? "" : out)}
              >
                {out} ({count})
              </button>
            );
          })}
        </div>

        {/* Filters and Search Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={leadCampaignFilter}
              onChange={(e) => setLeadCampaignFilter(e.target.value)}
              style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 13 }}
            >
              <option value="">All Campaigns</option>
              {s.campaigns.map((camp) => (
                <option key={camp.id} value={camp.id}>{camp.name}</option>
              ))}
            </select>

            <select
              value={leadChannelFilter}
              onChange={(e) => setLeadChannelFilter(e.target.value)}
              style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 13 }}
            >
              <option value="">All Channels</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="AI calling">AI Calling</option>
            </select>
          </div>

          <SearchBox
            value={leadSearchQuery}
            onChange={setLeadSearchQuery}
            placeholder="Search leads by name, email, company..."
          />
        </div>

        {/* Leads Table */}
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Contact</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Campaign</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Channel</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Outcome</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Status / Engagement</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Last Activity</th>
                <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(({ contact, campaign, channel, outcome, engagement, lastContactedAt }) => {
                const outcomeColor =
                  outcome === "INTERESTED"
                    ? { bg: "#ecfdf5", text: "#059669" }
                    : outcome === "FOLLOW UP"
                      ? { bg: "#fef3c7", text: "#d97706" }
                      : outcome === "NOT INTERESTED"
                        ? { bg: "#ffe4e6", text: "#e11d48" }
                        : outcome === "REJECTED" || outcome === "OPTED OUT"
                          ? { bg: "#fee2e2", text: "#dc2626" }
                          : { bg: "#f1f5f9", text: "#64748b" };

                return (
                  <tr key={contact.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "#e2e8f0",
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{contact.name}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {contact.company ? `${contact.company} · ` : ""}{contact.phone || contact.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#334155" }}>
                        {campaign ? campaign.name : "Direct Outreach"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            channel === "WhatsApp"
                              ? "#ecfdf5"
                              : channel === "Email"
                                ? "#eff6ff"
                                : "#faf5ff",
                          color:
                            channel === "WhatsApp"
                              ? "#059669"
                              : channel === "Email"
                                ? "#2563eb"
                                : "#7c3aed",
                        }}
                      >
                        {channel}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: outcomeColor.bg,
                          color: outcomeColor.text,
                        }}
                      >
                        {outcome}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>
                      {engagement}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>
                      {lastContactedAt ? date(lastContactedAt) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <select
                          value={outcome}
                          onChange={(e) => handleUpdateLeadOutcome(contact.id, e.target.value)}
                          style={{
                            height: 28,
                            padding: "0 6px",
                            borderRadius: 6,
                            fontSize: 11,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          {RAPID_LEAD_OUTCOMES.map((ro) => (
                            <option key={ro} value={ro}>{ro}</option>
                          ))}
                        </select>
                        {contact.phone && (
                          <button
                            type="button"
                            className="secondary"
                            title="Direct Call"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            onClick={() => notify(`Triggered outreach call for ${contact.name}`)}
                          >
                            <PhoneCall size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filteredLeads.length && (
          <Empty>No leads found matching your selected outcome or campaign filter.</Empty>
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title={channel ? `${channel} Campaigns` : "Omnichannel Campaigns"}
      description="Design, target, and simulate automated outreach campaigns across WhatsApp, Email, and AI Voice Calling."
      action={
        <button className="primary" onClick={() => open(null)}>
          New Campaign
        </button>
      }
    >
      {/* Top Stat Cards */}
      <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">TOTAL CAMPAIGNS</span>
          <div className="rapid-stat-value">{totalCount}</div>
          <span className="rapid-stat-sub">Across all outreach channels</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">ACTIVE / SCHEDULED</span>
          <div className="rapid-stat-value">{activeCount}</div>
          <span className="rapid-stat-sub">Queued for automated delivery</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">COMPLETED</span>
          <div className="rapid-stat-value">{completedCount}</div>
          <span className="rapid-stat-sub">Fully executed broadcasts</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">PAUSED</span>
          <div className="rapid-stat-value">{pausedCount}</div>
          <span className="rapid-stat-sub">Temporarily on hold</span>
        </div>
      </div>

      {/* Filter and Channel Tab Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "", label: "All Channels" },
            { id: "WhatsApp", label: "WhatsApp" },
            { id: "Email", label: "Email" },
            { id: "AI calling", label: "AI Calling" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeChannelTab === tab.id ? "primary" : "secondary"}
              style={{ padding: "6px 14px", fontSize: 13, borderRadius: 20 }}
              onClick={() => setActiveChannelTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search campaigns..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 13 }}
          >
            <option value="">All Statuses</option>
            {["Draft", "Scheduled", "Paused", "Cancelled", "Completed"].map(
              (status) => (
                <option key={status} value={status}>{status}</option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Campaign Name</th>
              <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Channel</th>
              <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Status</th>
              <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Eligible Audience</th>
              <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Scheduled</th>
              <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((c) => {
              const eligible = eligibleContacts(s, c).length;
              const total = c.contactIds.length;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Created {date(c.createdAt || c.updatedAt)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          c.channel === "WhatsApp"
                            ? "#ecfdf5"
                            : c.channel === "Email"
                              ? "#eff6ff"
                              : "#faf5ff",
                        color:
                          c.channel === "WhatsApp"
                            ? "#059669"
                            : c.channel === "Email"
                              ? "#2563eb"
                              : "#7c3aed",
                      }}
                    >
                      {c.channel}
                    </span>
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
                          c.status === "Scheduled"
                            ? "#ecfdf5"
                            : c.status === "Completed"
                              ? "#eff6ff"
                              : c.status === "Paused"
                                ? "#fef3c7"
                                : "#f1f5f9",
                        color:
                          c.status === "Scheduled"
                            ? "#059669"
                            : c.status === "Completed"
                              ? "#2563eb"
                              : c.status === "Paused"
                                ? "#d97706"
                                : "#64748b",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155" }}>
                    <strong>{eligible}</strong> / {total} contacts
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>
                    {c.scheduledAt ? date(c.scheduledAt) : "Instant execution"}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button className="secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setDetail(c.id)}>
                        Review
                      </button>
                      {c.status === "Scheduled" ? (
                        <button
                          className="secondary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => change(c, "Paused")}
                        >
                          Pause
                        </button>
                      ) : c.status === "Paused" ? (
                        <button
                          className="secondary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => change(c, "Scheduled")}
                        >
                          Resume
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!filteredList.length && (
        <Empty>
          No campaigns found matching your filter criteria. Click &quot;New Campaign&quot; to build one.
        </Empty>
      )}
      {noSequenceModalOpen && (
        <Modal
          title="Create a sequence first"
          close={() => setNoSequenceModalOpen(false)}
        >
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
              You don&apos;t have any sequences yet. A campaign needs a sequence to run against — build one in the Sequence Builder and then come back here to launch your campaign.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setNoSequenceModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                style={{ background: "#2563eb", color: "#fff" }}
                onClick={() => {
                  setNoSequenceModalOpen(false);
                  if (navigate) navigate("sequences");
                }}
              >
                Create Sequence
              </button>
            </div>
          </div>
        </Modal>
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
                  className="secondary"
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
                  Simulate test run
                </button>
                <button
                  className="primary"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    border: "none",
                    fontWeight: 700,
                  }}
                  disabled={
                    Boolean(validateCampaign(s, current).length) ||
                    current.status === "Paused"
                  }
                  onClick={() => {
                    try {
                      const eligible = eligibleContacts(s, current);
                      const cost = eligible.length * (current.channel === "AI calling" ? 5 : 1);
                      if (balance(s) < cost) {
                        notify(`Insufficient credits. You need ₹${cost.toLocaleString()} credits to launch.`);
                        return;
                      }

                      // Trigger server dispatch endpoint
                      fetch("/api/campaigns/dispatch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          campaignId: current.id,
                          channel: current.channel,
                          recipientCount: eligible.length,
                          gatewayMode: "managed",
                        }),
                      }).catch(() => {});

                      if (update((state) => runCampaign(state, current.id))) {
                        notify(`🚀 Live Campaign Dispatched to ${eligible.length} recipients via Leadpilot Managed Gateway!`);
                        setDetail("");
                      }
                    } catch (err) {
                      notify((err as Error).message);
                    }
                  }}
                >
                  🚀 Launch Live Campaign
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
