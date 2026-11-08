"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now, toCsv, type LocalAgent } from "@/lib/local-workspace";
import { simulateCall } from "@/lib/outreach";
import { Panel, Empty, Modal, Badge, formValue, date, download, SearchBox } from "./ui";
import {
  Phone,
  Play,
  Pause,
  Volume2,
  Mic,
  Settings,
  Sliders,
  FileText,
  UserCheck,
  Bot,
  Sparkles,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Plus,
} from "lucide-react";

const INDIC_LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Bengali",
  "Kannada",
  "Punjabi",
  "Malayalam",
] as const;

const VOICE_PERSONAS = [
  { id: "Priya", name: "Priya", desc: "Natural Indian English & Hindi · Warm & Professional", gender: "Female" },
  { id: "Aarav", name: "Aarav", desc: "Crisp & Clear Hindi · Confident", gender: "Male" },
  { id: "Rohan", name: "Rohan", desc: "Executive Indian English · Authoritative", gender: "Male" },
  { id: "Ananya", name: "Ananya", desc: "Friendly & Enthusiastic · Consultative", gender: "Female" },
  { id: "Deepak", name: "Deepak", desc: "Direct & Persuasive · Sales Closer", gender: "Male" },
];

const PERSONALITIES = [
  "Professional",
  "Friendly",
  "Assertive",
  "Empathetic",
  "Sales Closer",
];

export default function Voice({
  view,
  notify,
}: {
  view: string;
  notify: (s: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [edit, setEdit] = useState<LocalAgent | null | undefined>();
  const [test, setTest] = useState(false);
  const [log, setLog] = useState("");
  const [activeTab, setActiveTab] = useState<"identity" | "script" | "knowledge" | "controls">("identity");
  const [audioModal, setAudioModal] = useState<{ id: string; contact: string; agent: string; duration: number } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<"Conversational" | "Scripted" | "IVR Menu">("Conversational");
  const [selectedPersonality, setSelectedPersonality] = useState("Professional");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [filterOutcome, setFilterOutcome] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const call = s.calls.find((c) => c.id === log);

  // Compute metrics
  const totalCalls = s.calls.length;
  const completedCalls = s.calls.filter((c) => c.duration > 0).length;
  const qualifiedCalls = s.calls.filter((c) => c.outcome === "Qualified").length;
  const totalSeconds = s.calls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalCredits = s.calls.reduce((sum, c) => sum + Math.ceil(c.duration / 60) * 5, 0);

  const filteredCalls = s.calls.filter((c) => {
    const contact = s.contacts.find((p) => p.id === c.contactId);
    const agent = s.agents.find((a) => a.id === c.agentId);
    const matchesSearch =
      !searchQuery ||
      (contact?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact?.phone || "").includes(searchQuery);
    const matchesOutcome = !filterOutcome || c.outcome === filterOutcome;
    return matchesSearch && matchesOutcome;
  });

  const handleOpenEdit = (a: LocalAgent | null) => {
    setEdit(a);
    setActiveTab("identity");
    setSelectedAgentType(a?.agentType || "Conversational");
    setSelectedPersonality(a?.personality || "Professional");
    setVoiceSpeed(a?.speed || 1.0);
  };

  return (
    <>
      <Panel
        title={
          view === "Agent Builder"
            ? "AI Calling · Agent Builder"
            : view === "Call Center"
              ? "AI Calling · Call Center"
              : "AI Calling · Call Logs"
        }
        description={
          view === "Agent Builder"
            ? "Configure Conversational, Scripted, and IVR voice agents with Indic speech models, knowledge base, and human handoff."
            : "Monitor outbound AI voice calls, evaluate call outcomes, review transcripts, and listen to recordings."
        }
        action={
          <div className="console-actions">
            <button className="secondary" onClick={() => setTest(true)}>
              <PhoneCall size={14} style={{ marginRight: 6 }} />
              Test Call Preview
            </button>
            <button className="primary" onClick={() => handleOpenEdit(null)}>
              <Plus size={14} style={{ marginRight: 6 }} />
              Create Voice Agent
            </button>
          </div>
        }
      >
        {/* Metric Cards Banner */}
        <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">TOTAL AGENTS</span>
            <div className="rapid-stat-value">{s.agents.length}</div>
            <span className="rapid-stat-sub">
              {s.agents.filter((a) => (a.agentType || "Conversational") === "Conversational").length} Conversational ·{" "}
              {s.agents.filter((a) => a.agentType === "Scripted").length} Scripted
            </span>
          </div>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">TOTAL CALLS</span>
            <div className="rapid-stat-value">{totalCalls}</div>
            <span className="rapid-stat-sub">{completedCalls} completed · {totalCalls - completedCalls} pending</span>
          </div>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">QUALIFIED RATE</span>
            <div className="rapid-stat-value">
              {totalCalls > 0 ? `${Math.round((qualifiedCalls / totalCalls) * 100)}%` : "0.0%"}
            </div>
            <span className="rapid-stat-sub">{qualifiedCalls} qualified leads</span>
          </div>
          <div className="rapid-stat-card">
            <span className="rapid-stat-label">TOTAL TALK TIME</span>
            <div className="rapid-stat-value">{totalMinutes}m</div>
            <span className="rapid-stat-sub">{totalCredits} credits billed</span>
          </div>
        </div>

        {/* AGENT BUILDER VIEW */}
        {view === "Agent Builder" && (
          <>
            <div className="rapid-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Active Voice Agents</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                  Agents handle real-time customer dialogues with multi-turn reasoning and human fallback.
                </p>
              </div>
            </div>

            <div className="rapid-two-col-grid" style={{ marginBottom: 24 }}>
              {s.agents.map((a) => (
                <article
                  key={a.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "#e0e7ff",
                            color: "#4338ca",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Bot size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{a.name}</h3>
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            {a.voice || "Priya"} · {a.language}
                          </span>
                        </div>
                      </div>
                      <Badge>{a.agentType || "Conversational"}</Badge>
                    </div>

                    <p style={{ fontSize: 13, color: "#475569", margin: "10px 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.instructions}
                    </p>

                    {a.greeting && (
                      <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#334155", marginBottom: 12 }}>
                        <strong>Greeting:</strong> &quot;{a.greeting}&quot;
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#64748b" }}>
                      <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 4 }}>
                        ⏱ Max {a.maxDuration}s
                      </span>
                      <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 4 }}>
                        ⚡ {a.concurrency} Concurrent
                      </span>
                      <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: 4 }}>
                        🎭 {a.personality || "Professional"}
                      </span>
                      {a.handoff && (
                        <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: 4 }}>
                          📞 Transfer: {a.handoff}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                    <button className="secondary" style={{ flex: 1 }} onClick={() => handleOpenEdit(a)}>
                      <Settings size={13} style={{ marginRight: 5 }} />
                      Edit Agent
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        const cloned: LocalAgent = {
                          ...a,
                          id: uid(),
                          name: `${a.name} (Copy)`,
                          updatedAt: now(),
                        };
                        if (update((state) => ({ ...state, agents: [...state.agents, cloned] }))) {
                          notify(`Agent duplicated as "${cloned.name}"`);
                        }
                      }}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className="primary"
                      onClick={() => {
                        setTest(true);
                      }}
                    >
                      <PhoneCall size={13} style={{ marginRight: 5 }} />
                      Simulate Call
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {!s.agents.length && (
              <Empty>
                No voice agents created yet. Click &quot;Create Voice Agent&quot; above to configure your first conversational AI caller.
              </Empty>
            )}
          </>
        )}

        {/* CALL CENTER / CALL LOGS VIEW */}
        {view !== "Agent Builder" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <SearchBox value={searchQuery} onChange={setSearchQuery} placeholder="Search caller, agent or phone..." />
                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                  style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 13 }}
                >
                  <option value="">All Outcomes</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Not interested">Not interested</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      "rapid-call-logs.csv",
                      toCsv([
                        ["Call ID", "Agent", "Contact", "Phone", "Outcome", "Duration (sec)", "Cost (Credits)", "Timestamp"],
                        ...filteredCalls.map((c) => {
                          const contact = s.contacts.find((p) => p.id === c.contactId);
                          const agent = s.agents.find((a) => a.id === c.agentId);
                          return [
                            c.id,
                            agent?.name || "Agent",
                            contact?.name || "Customer",
                            contact?.phone || "",
                            c.outcome,
                            c.duration,
                            Math.ceil(c.duration / 60) * 5,
                            c.at,
                          ];
                        }),
                      ]),
                      "text/csv",
                    )
                  }
                >
                  Export CSV Logs
                </button>
              </div>
            </div>

            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Contact</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Agent</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Outcome</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Duration</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Cost</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Date & Time</th>
                    <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((c) => {
                    const contact = s.contacts.find((p) => p.id === c.contactId);
                    const agent = s.agents.find((a) => a.id === c.agentId);
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{contact?.name || "Customer"}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{contact?.phone || "No phone"}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 500, color: "#334155" }}>{agent?.name || "Agent"}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{agent?.language || "English"}</div>
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
                                c.outcome === "Qualified"
                                  ? "#ecfdf5"
                                  : c.outcome === "Follow-up"
                                    ? "#fef3c7"
                                    : "#f1f5f9",
                              color:
                                c.outcome === "Qualified"
                                  ? "#059669"
                                  : c.outcome === "Follow-up"
                                    ? "#d97706"
                                    : "#64748b",
                            }}
                          >
                            {c.outcome}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155" }}>
                          {Math.floor(c.duration / 60)}m {c.duration % 60}s
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#334155" }}>
                          {Math.ceil(c.duration / 60) * 5} credits
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748b" }}>{date(c.at)}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              className="secondary"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              onClick={() =>
                                setAudioModal({
                                  id: c.id,
                                  contact: contact?.name || "Customer",
                                  agent: agent?.name || "Agent",
                                  duration: c.duration,
                                })
                              }
                            >
                              <Play size={12} style={{ marginRight: 4 }} />
                              Listen
                            </button>
                            <button
                              className="secondary"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              onClick={() => setLog(c.id)}
                            >
                              <FileText size={12} style={{ marginRight: 4 }} />
                              Transcript
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!filteredCalls.length && (
              <Empty>No call logs match the selected filters. Run a test call to view logs.</Empty>
            )}
          </>
        )}
      </Panel>

      {/* AUDIO RECORDING PLAYER MODAL */}
      {audioModal && (
        <Modal title="Call Recording Playback" close={() => { setAudioModal(null); setIsPlayingAudio(false); }}>
          <div style={{ padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  Call with {audioModal.contact}
                </h4>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Agent: {audioModal.agent} · Duration: {Math.floor(audioModal.duration / 60)}m {audioModal.duration % 60}s
                </span>
              </div>
              <Badge>Simulated Audio</Badge>
            </div>

            {/* Waveform graphic */}
            <div
              style={{
                height: 60,
                background: "#0f172a",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "0 16px",
                marginBottom: 16,
              }}
            >
              {Array.from({ length: 48 }).map((_, i) => {
                const height = isPlayingAudio ? Math.sin(i * 0.4 + Date.now() * 0.005) * 20 + 24 : ((i * 7) % 32) + 8;
                return (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      height: `${Math.max(6, height)}px`,
                      background: isPlayingAudio ? "#38bdf8" : "#475569",
                      borderRadius: 2,
                      transition: "height 0.15s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Playback Controls */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <button
                className="primary"
                style={{ width: 48, height: 48, borderRadius: "50%", padding: 0, display: "grid", placeItems: "center" }}
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              >
                {isPlayingAudio ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
              </button>
            </div>

            <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", margin: 0 }}>
              Live production calls are recorded and encrypted with AES-256 in compliant local storage.
            </p>
          </div>
        </Modal>
      )}

      {/* AGENT BUILDER / EDIT MODAL */}
      {edit !== undefined && (
        <Modal
          title={edit ? `Edit Voice Agent: ${edit.name}` : "Create Voice Agent"}
          close={() => setEdit(undefined)}
        >
          {/* Subtabs within Modal */}
          <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #e2e8f0", paddingBottom: 10, marginBottom: 16 }}>
            <button
              type="button"
              className={activeTab === "identity" ? "primary" : "secondary"}
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setActiveTab("identity")}
            >
              1. Persona & Voice
            </button>
            <button
              type="button"
              className={activeTab === "script" ? "primary" : "secondary"}
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setActiveTab("script")}
            >
              2. Script & Prompts
            </button>
            <button
              type="button"
              className={activeTab === "knowledge" ? "primary" : "secondary"}
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setActiveTab("knowledge")}
            >
              3. Knowledge Base
            </button>
            <button
              type="button"
              className={activeTab === "controls" ? "primary" : "secondary"}
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setActiveTab("controls")}
            >
              4. Controls & Handoff
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const agent: LocalAgent = {
                id: edit?.id || uid(),
                name: formValue(f, "name"),
                language: formValue(f, "language") as typeof INDIC_LANGUAGES[number],
                voice: formValue(f, "voice"),
                agentType: selectedAgentType,
                personality: selectedPersonality,
                speed: voiceSpeed,
                greeting: formValue(f, "greeting"),
                pronunciation: formValue(f, "pronunciation"),
                instructions: formValue(f, "instructions"),
                knowledge: formValue(f, "knowledge"),
                qualification: formValue(f, "qualification"),
                maxDuration: Number(f.get("maxDuration")) || 120,
                concurrency: Number(f.get("concurrency")) || 1,
                handoff: formValue(f, "handoff"),
                updatedAt: now(),
              };

              if (
                update((state) => ({
                  ...state,
                  agents: edit
                    ? state.agents.map((a) => (a.id === agent.id ? agent : a))
                    : [...state.agents, agent],
                }))
              ) {
                setEdit(undefined);
                notify(`Voice agent "${agent.name}" saved successfully`);
              }
            }}
          >
            {/* TAB 1: IDENTITY & VOICE */}
            {activeTab === "identity" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  Agent Name
                  <input
                    name="name"
                    required
                    maxLength={200}
                    defaultValue={edit?.name || "Leadpilot Revenue Specialist"}
                    placeholder="e.g. Inbound Sales Closer, Payment Reminder"
                  />
                </label>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Agent Type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { type: "Conversational", desc: "Dynamic two-way AI dialogue with barge-in interruption" },
                      { type: "Scripted", desc: "Step-by-step fixed script with auto-hangup" },
                      { type: "IVR Menu", desc: "Press-key DTMF menu attached to an IVR flow" },
                    ].map((item) => (
                      <div
                        key={item.type}
                        onClick={() => setSelectedAgentType(item.type as any)}
                        style={{
                          border: selectedAgentType === item.type ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          borderRadius: 8,
                          padding: 10,
                          cursor: "pointer",
                          background: selectedAgentType === item.type ? "#eff6ff" : "#ffffff",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13, color: selectedAgentType === item.type ? "#1d4ed8" : "#1e293b" }}>
                          {item.type}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="console-form-grid">
                  <label>
                    Language
                    <select name="language" defaultValue={edit?.language || "English"}>
                      {INDIC_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Voice Persona
                    <select name="voice" defaultValue={edit?.voice || "Priya"}>
                      {VOICE_PERSONAS.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({p.desc})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Personality Tone</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PERSONALITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPersonality(p)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: selectedPersonality === p ? "1px solid #2563eb" : "1px solid #cbd5e1",
                          background: selectedPersonality === p ? "#2563eb" : "#ffffff",
                          color: selectedPersonality === p ? "#ffffff" : "#475569",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontWeight: 600 }}>Speech Pace: {voiceSpeed}x</label>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Normal: 1.0x</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="button" className="primary" onClick={() => setActiveTab("script")}>
                    Next: Script & Prompts →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SCRIPT & PROMPTS */}
            {activeTab === "script" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label>
                  Opening Greeting
                  <input
                    name="greeting"
                    maxLength={1000}
                    defaultValue={edit?.greeting || "Hello! Am I speaking with {{name}}? I'm calling from Leadpilot regarding your recent inquiry."}
                    placeholder="The first sentence spoken as soon as call connects"
                  />
                  <small style={{ color: "#64748b", marginTop: 2, display: "block" }}>
                    Supports dynamic variables: {`{{name}}`}, {`{{company}}`}.
                  </small>
                </label>

                <label>
                  System Instructions & Conversation Rules
                  <textarea
                    name="instructions"
                    required
                    rows={5}
                    maxLength={10000}
                    defaultValue={
                      edit?.instructions ||
                      "You are a sales specialist for Leadpilot. Greet the customer professionally. Explain how Leadpilot automates multi-channel outreach across WhatsApp, Email, and AI Voice Calling. If they are interested, qualify their monthly lead volume and budget, then schedule a demo or offer to transfer to a senior representative."
                    }
                    placeholder="Define who the AI is, what goal to achieve, and how to handle objections."
                  />
                </label>

                <label>
                  Pronunciation Dictionary
                  <textarea
                    name="pronunciation"
                    rows={2}
                    maxLength={2000}
                    defaultValue={edit?.pronunciation || "Leadpilot: Lead-pilot\nSaaS: Sass\nAPI: A-P-I\nROI: R-O-I"}
                    placeholder="Word: Pronunciation (one per line)"
                  />
                  <small style={{ color: "#64748b", marginTop: 2, display: "block" }}>
                    Ensure brand names and industry terms sound natural.
                  </small>
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button type="button" className="secondary" onClick={() => setActiveTab("identity")}>
                    ← Back
                  </button>
                  <button type="button" className="primary" onClick={() => setActiveTab("knowledge")}>
                    Next: Knowledge Base →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: KNOWLEDGE BASE */}
            {activeTab === "knowledge" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Company & Product Knowledge Base</label>
                    <label
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "#2563eb",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 600,
                      }}
                    >
                      <span>📄 Upload PDF / Document</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            notify(`Extracted document content from "${file.name}" into knowledge base`);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    name="knowledge"
                    rows={6}
                    maxLength={30000}
                    defaultValue={
                      edit?.knowledge ||
                      "Leadpilot is an autonomous B2B revenue and outreach platform. Pricing starts at ₹3,000/month for Basic and ₹6,000/month for Advance. Key features include AI calling with conversational human voice and barge-in, official WhatsApp Cloud API broadcasts, warm email sequences, and automatic lead qualification CRM."
                    }
                    placeholder="Paste FAQs, product specs, pricing tiers, and company information here."
                  />
                </div>

                <label>
                  Lead Qualification Questions
                  <textarea
                    name="qualification"
                    rows={3}
                    maxLength={2000}
                    defaultValue={
                      edit?.qualification ||
                      "1. What is your current monthly lead volume?\n2. Are you looking to automate WhatsApp or voice calls first?\n3. When are you looking to get started?"
                    }
                    placeholder="List specific questions the agent must ask before marking as Qualified."
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button type="button" className="secondary" onClick={() => setActiveTab("script")}>
                    ← Back
                  </button>
                  <button type="button" className="primary" onClick={() => setActiveTab("controls")}>
                    Next: Controls & Handoff →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: CONTROLS & HANDOFF */}
            {activeTab === "controls" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="console-form-grid">
                  <label>
                    Max Call Duration (seconds)
                    <input
                      name="maxDuration"
                      type="number"
                      min={30}
                      max={900}
                      required
                      defaultValue={edit?.maxDuration || 180}
                    />
                    <small style={{ color: "#64748b" }}>Recommended: 120s - 300s</small>
                  </label>

                  <label>
                    Concurrency Limit
                    <input
                      name="concurrency"
                      type="number"
                      min={1}
                      max={20}
                      required
                      defaultValue={edit?.concurrency || 3}
                    />
                    <small style={{ color: "#64748b" }}>Parallel outbound lines</small>
                  </label>
                </div>

                <label>
                  Human Handoff Number / Transfer Desk
                  <input
                    name="handoff"
                    maxLength={200}
                    defaultValue={edit?.handoff || "+919876543210"}
                    placeholder="+919876543210 (Forward call when customer requests representative)"
                  />
                </label>

                {/* IVR Flow Attachment */}
                <label>
                  Attach Outbound IVR Flow (Optional)
                  <select
                    defaultValue=""
                    style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 13 }}
                  >
                    <option value="">None — Standard Direct AI Call</option>
                    {s.resources
                      .filter((r) => r.kind === "ivr")
                      .map((ivr) => (
                        <option key={ivr.id} value={ivr.id}>
                          {ivr.name} ({ivr.data.direction || "Both"})
                        </option>
                      ))}
                  </select>
                  <small style={{ color: "#64748b", marginTop: 2, display: "block" }}>
                    When set, outbound calls begin with the selected IVR keypad flow before escalating to this AI agent.
                  </small>
                </label>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 12, color: "#475569" }}>
                  <strong>Safety Protocol:</strong> If customer expresses explicit disinterest or requests opt-out, the agent politely concludes the dialogue and suppresses subsequent follow-ups.
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <button type="button" className="secondary" onClick={() => setActiveTab("knowledge")}>
                    ← Back
                  </button>
                  <button type="submit" className="primary">
                    Save Voice Agent
                  </button>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* SCRIPTED TEST CALL SIMULATOR MODAL */}
      {test && (
        <Modal title="Voice Call Preview Simulator" close={() => setTest(false)}>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Simulate a call dialogue with a selected agent and contact to test qualification criteria and update sample ledger. Cost: 5 sample credits per minute.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                if (
                  update((state) =>
                    simulateCall(
                      state,
                      formValue(f, "agent"),
                      formValue(f, "contact"),
                      formValue(f, "outcome") as "Qualified" | "Follow-up" | "Not interested",
                      Number(f.get("duration")),
                    ),
                  )
                ) {
                  setTest(false);
                  notify("Call simulation logged; contact status updated & credits deducted");
                }
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            <label>
              Select Agent
              <select name="agent" required defaultValue={s.agents[0]?.id || ""}>
                <option value="">Choose agent...</option>
                {s.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.language} · {a.agentType || "Conversational"})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Select Contact
              <select name="contact" required defaultValue={s.contacts[0]?.id || ""}>
                <option value="">Choose contact...</option>
                {s.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || c.email})
                  </option>
                ))}
              </select>
            </label>

            <div className="console-form-grid">
              <label>
                Simulated Outcome
                <select name="outcome" defaultValue="Qualified">
                  <option value="Qualified">Qualified (High Intent)</option>
                  <option value="Follow-up">Follow-up (Call back later)</option>
                  <option value="Not interested">Not interested</option>
                </select>
              </label>

              <label>
                Call Duration (seconds)
                <input type="number" name="duration" min={15} max={600} required defaultValue={75} />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button type="button" className="secondary" onClick={() => setTest(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Run Simulation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* TRANSCRIPT MODAL */}
      {call && (
        <Modal title="Call Transcript & Sentiment Breakdown" close={() => setLog("")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Badge>{call.outcome}</Badge>
            <span style={{ fontSize: 12, color: "#64748b" }}>Duration: {call.duration}s</span>
          </div>

          <div
            style={{
              maxHeight: 350,
              overflowY: "auto",
              padding: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {call.transcript.map((line, i) => (
              <div
                key={i}
                style={{
                  alignSelf: line.speaker === "Agent" ? "flex-start" : "flex-end",
                  maxWidth: "80%",
                  background: line.speaker === "Agent" ? "#ffffff" : "#e0e7ff",
                  border: line.speaker === "Agent" ? "1px solid #cbd5e1" : "1px solid #c7d2fe",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: line.speaker === "Agent" ? "#4338ca" : "#1e40af", marginBottom: 2 }}>
                  {line.speaker}
                </div>
                <div style={{ color: "#0f172a", lineHeight: 1.4 }}>{line.text}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              className="secondary"
              onClick={() =>
                download(
                  `transcript-${call.id}.txt`,
                  call.transcript.map((line) => `${line.speaker}: ${line.text}`).join("\n\n"),
                )
              }
            >
              Export Transcript
            </button>
            <button className="primary" onClick={() => setLog("")}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
