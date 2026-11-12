"use client";

import { useState } from "react";
import {
  Bot,
  Phone,
  MessageCircle,
  Mail,
  Sparkles,
  Play,
  CheckCircle2,
  Zap,
  Users,
  ShieldCheck,
  ArrowRight,
  Plus,
  Activity,
  GitBranch,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useWorkspace } from "../local-provider";
import { uid, now } from "@/lib/local-workspace";
import { Panel, Badge } from "./ui";

type SwarmWorker = {
  id: string;
  handle: string;
  name: string;
  role: string;
  channel: "WhatsApp" | "AI calling" | "Email" | "CRM";
  enabled: boolean;
  model: string;
  avgLatency: string;
  successRate: string;
  instructions: string;
};

type SwarmBlueprint = {
  id: string;
  name: string;
  category: string;
  description: string;
  conversionLift: string;
  channels: ("WhatsApp" | "AI calling" | "Email")[];
  workers: string[];
};

type SwarmLog = {
  id: string;
  agent: string;
  channel: string;
  message: string;
  timestamp: string;
  status: "done" | "working" | "handoff";
};

const INITIAL_WORKERS: SwarmWorker[] = [
  {
    id: "w-coord",
    handle: "@coordinator",
    name: "Swarm Orchestrator",
    role: "Intent router, timezone guard & credit reservation",
    channel: "CRM",
    enabled: true,
    model: "Claude 3.5 Haiku",
    avgLatency: "180ms",
    successRate: "99.4%",
    instructions:
      "Inspect incoming lead source, check DND & working hours, reserve credits, and dispatch to the highest-converting channel worker.",
  },
  {
    id: "w-wa",
    handle: "@whatsapp-qualifier",
    name: "WhatsApp Qualifier",
    role: "Sub-10s greeting, FAQ grounding & intent detection",
    channel: "WhatsApp",
    enabled: true,
    model: "Meta Cloud + Bedrock",
    avgLatency: "1.2s",
    successRate: "68% Reply",
    instructions:
      "Send personalized HSM template within 10s. Answer pricing/delivery questions from Knowledge Base. If no reply in 15m, hand off to @voice-closer.",
  },
  {
    id: "w-voice",
    handle: "@voice-closer",
    name: "AI Voice Closer",
    role: "Multilingual Indian voice call & COD / demo booking",
    channel: "AI calling",
    enabled: true,
    model: "Cartesia + Sarvam AI",
    avgLatency: "320ms",
    successRate: "44% Connected",
    instructions:
      "Call lead in Hindi/English/Gujarati. Confirm budget, address, or demo slot. Summarize call transcript and pass score to @crm-monitor.",
  },
  {
    id: "w-email",
    handle: "@email-nurture",
    name: "Email Follow-Up Agent",
    role: "Brochure delivery, case studies & calendar links",
    channel: "Email",
    enabled: true,
    model: "Gmail / Zoho OAuth",
    avgLatency: "2.1s",
    successRate: "52% Open",
    instructions:
      "Send detailed proposal PDF and Razorpay payment or calendar booking link when prospect requests documentation.",
  },
];

const SWARM_BLUEPRINTS: SwarmBlueprint[] = [
  {
    id: "bp-rto",
    name: "D2C COD & RTO Killer Swarm",
    category: "E-Commerce",
    description:
      "WhatsApp order check -> 15m no-reply triggers Hindi/English AI Voice COD verification call -> Auto-tags Shopify order.",
    conversionLift: "-38% RTO",
    channels: ["WhatsApp", "AI calling"],
    workers: ["@coordinator", "@whatsapp-qualifier", "@voice-closer"],
  },
  {
    id: "bp-b2b",
    name: "B2B Speed-to-Lead Swarm",
    category: "B2B SaaS",
    description:
      "Instant WhatsApp welcome + sub-30s AI discovery call + personalized Gmail proposal + round-robin AE handoff.",
    conversionLift: "3.4x Demos",
    channels: ["WhatsApp", "AI calling", "Email"],
    workers: ["@coordinator", "@whatsapp-qualifier", "@voice-closer", "@email-nurture"],
  },
  {
    id: "bp-realestate",
    name: "Real Estate Site Visit Swarm",
    category: "Real Estate",
    description:
      "Sends project brochure on WhatsApp, qualifies BHK & budget via AI Voice Call, and books weekend site visits.",
    conversionLift: "+54% Visits",
    channels: ["WhatsApp", "AI calling"],
    workers: ["@coordinator", "@whatsapp-qualifier", "@voice-closer"],
  },
  {
    id: "bp-cart",
    name: "Abandoned Cart Recovery Swarm",
    category: "D2C",
    description:
      "15m WhatsApp discount nudge -> 2h AI Voice concierge call -> 24h final Email offer with Razorpay checkout link.",
    conversionLift: "24% Recovery",
    channels: ["WhatsApp", "AI calling", "Email"],
    workers: ["@coordinator", "@whatsapp-qualifier", "@voice-closer", "@email-nurture"],
  },
];

export default function AgentSwarm({
  notify,
  navigate,
}: {
  notify: (msg: string) => void;
  navigate: (page: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [workers, setWorkers] = useState<SwarmWorker[]>(INITIAL_WORKERS);
  const [swarmActive, setSwarmActive] = useState(true);
  const [executionMode, setExecutionMode] = useState<"parallel" | "sequential">("parallel");
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>("bp-b2b");
  const [testLeadName, setTestLeadName] = useState("Aarav Sharma");
  const [testLeadPhone, setTestLeadPhone] = useState("+91 9876543210");
  const [simulating, setSimulating] = useState(false);
  const [logs, setLogs] = useState<SwarmLog[]>([
    {
      id: "l-1",
      agent: "@coordinator",
      channel: "CRM",
      message: "Swarm initialized in Parallel Coordination mode. 4 specialist workers standing by.",
      timestamp: "Ready",
      status: "done",
    },
  ]);

  const toggleWorker = (id: string) => {
    setWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
    );
    notify("Updated swarm worker roster.");
  };

  const deployBlueprint = (bp: SwarmBlueprint) => {
    setSelectedBlueprint(bp.id);
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        enabled: bp.workers.includes(w.handle),
      })),
    );

    const sequenceId = uid();
    const at = now();
    update((prev) => ({
      ...prev,
      sequences: [
        {
          id: sequenceId,
          name: `${bp.name} (Swarm)`,
          description: bp.description,
          steps: [
            {
              id: uid(),
              type: "WhatsApp",
              templateId: prev.templates[0]?.id || "welcome-wa",
              agentId: prev.agents[0]?.id || "",
              minutes: 1,
              condition: "Consent recorded",
            },
            {
              id: uid(),
              type: "AI calling",
              templateId: prev.templates[0]?.id || "welcome-wa",
              agentId: prev.agents[0]?.id || "",
              minutes: 15,
              condition: "Qualified lead",
            },
          ],
          updatedAt: at,
        },
        ...prev.sequences,
      ],
    }));

    notify(`Deployed "${bp.name}" into your workspace Sequences & Swarm!`);
  };

  const runSwarmSimulation = () => {
    const activeWorkers = workers.filter((w) => w.enabled);
    if (activeWorkers.length === 0) {
      notify("Enable at least one worker agent in the swarm first.");
      return;
    }

    setSimulating(true);
    const lead = testLeadName.trim() || "Aarav Sharma";
    const phone = testLeadPhone.trim() || "+91 9876543210";

    const script: Omit<SwarmLog, "id">[] = [
      {
        agent: "@coordinator",
        channel: "CRM",
        message: `New lead ${lead} (${phone}) ingested. Reserved 6 credits. Routing in ${executionMode.toUpperCase()} mode.`,
        timestamp: "00:00.2s",
        status: "handoff",
      },
      ...(workers.find((w) => w.id === "w-wa")?.enabled
        ? [
            {
              agent: "@whatsapp-qualifier",
              channel: "WhatsApp",
              message: `Dispatched personalized WhatsApp greeting to ${phone}. Lead replied: "Share pricing for 50 seats". Forwarding intent to @voice-closer.`,
              timestamp: "00:01.4s",
              status: "handoff" as const,
            },
          ]
        : []),
      ...(workers.find((w) => w.id === "w-voice")?.enabled
        ? [
            {
              agent: "@voice-closer",
              channel: "AI calling",
              message: `Connected 1m 18s Hinglish AI call with ${lead}. Qualified ₹75,000 budget & booked demo for tomorrow 4:00 PM IST.`,
              timestamp: "00:03.1s",
              status: "done" as const,
            },
          ]
        : []),
      ...(workers.find((w) => w.id === "w-email")?.enabled
        ? [
            {
              agent: "@email-nurture",
              channel: "Email",
              message: `Sent calendar invite + enterprise PDF deck via connected Gmail. Tracking pixel active.`,
              timestamp: "00:04.0s",
              status: "done" as const,
            },
          ]
        : []),
      {
        agent: "@coordinator",
        channel: "CRM",
        message: `Swarm goal achieved for ${lead}! Lead Score: 94/100 (Hot). Assigned to Rahul Verma & sent WhatsApp alert.`,
        timestamp: "00:04.5s",
        status: "done",
      },
    ];

    setLogs([]);
    script.forEach((step, idx) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, { ...step, id: `sim-${Date.now()}-${idx}` }]);
        if (idx === script.length - 1) {
          setSimulating(false);
          notify(`Swarm completed multi-agent outreach for ${lead}!`);
        }
      }, (idx + 1) * 650);
    });
  };

  const activeCount = workers.filter((w) => w.enabled).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)",
          borderRadius: 14,
          padding: "24px 28px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.25)",
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                letterSpacing: "0.5px",
              }}
            >
              MULTI-AGENT ORCHESTRATION
            </span>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>
              {activeCount} / {workers.length} Workers Active
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#ffffff" }}>
            Leadpilot Autonomous Agent Swarm
          </h2>
          <p style={{ fontSize: 13, color: "#e2e8f0", margin: 0, lineHeight: 1.5 }}>
            Coordinate specialized WhatsApp, AI Voice Calling, and Email agents on a shared blackboard.
            Agents automatically @mention, hand off context, and close leads 24/7.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setSwarmActive((v) => !v);
              notify(swarmActive ? "Agent Swarm paused." : "Agent Swarm activated!");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              background: swarmActive ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {swarmActive ? <Activity size={15} /> : <Pause size={15} />}
            {swarmActive ? "Swarm Live" : "Swarm Paused"}
          </button>

          <button
            type="button"
            onClick={runSwarmSimulation}
            disabled={simulating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#38bdf8",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Play size={15} />
            {simulating ? "Running Swarm..." : "Test Swarm Live"}
          </button>
        </div>
      </div>

      {/* Swarm Roster & Mode Selector */}
      <Panel
        title="Swarm Worker Roster"
        description="Enable or configure the specialist agents collaborating inside this workspace."
        action={
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            {(["parallel", "sequential"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setExecutionMode(m);
                  notify(`Switched swarm coordination to ${m} mode.`);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  background: executionMode === m ? "#ffffff" : "transparent",
                  color: executionMode === m ? "#2563eb" : "#64748b",
                }}
              >
                {m} Mode
              </button>
            ))}
          </div>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {workers.map((w) => {
            const Icon =
              w.channel === "WhatsApp"
                ? MessageCircle
                : w.channel === "AI calling"
                  ? Phone
                  : w.channel === "Email"
                    ? Mail
                    : Bot;
            return (
              <div
                key={w.id}
                style={{
                  border: w.enabled ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 16,
                  background: w.enabled ? "#f8faff" : "#ffffff",
                  opacity: w.enabled ? 1 : 0.7,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: w.enabled ? "#2563eb" : "#e2e8f0",
                        color: w.enabled ? "#ffffff" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: "#0f172a", display: "block" }}>{w.name}</strong>
                      <code style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>{w.handle}</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWorker(w.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: w.enabled ? "#dcfce7" : "#f1f5f9",
                      color: w.enabled ? "#166534" : "#64748b",
                    }}
                  >
                    {w.enabled ? "ACTIVE" : "OFF"}
                  </button>
                </div>

                <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.4 }}>{w.role}</p>

                <div
                  style={{
                    fontSize: 11,
                    color: "#334155",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {w.instructions}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "#64748b",
                    paddingTop: 6,
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <span>Model: <strong style={{ color: "#0f172a" }}>{w.model}</strong></span>
                  <span>Perf: <strong style={{ color: "#059669" }}>{w.successRate}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Two-Column: Pre-Built Swarm Blueprints & Live Blackboard Simulator */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
        {/* Blueprints */}
        <Panel
          title="1-Click Swarm Blueprints"
          description="Deploy pre-configured multi-agent workflows directly into your Sequences & Agents."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SWARM_BLUEPRINTS.map((bp) => {
              const isSelected = selectedBlueprint === bp.id;
              return (
                <div
                  key={bp.id}
                  style={{
                    border: isSelected ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 14,
                    background: isSelected ? "#f8faff" : "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 14, color: "#0f172a" }}>{bp.name}</strong>
                      <Badge>{bp.category}</Badge>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#059669",
                        background: "#ecfdf5",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {bp.conversionLift}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.4 }}>
                    {bp.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {bp.channels.map((ch) => (
                        <span
                          key={ch}
                          style={{
                            fontSize: 11,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="primary"
                      style={{ padding: "6px 12px", fontSize: 12, background: "#2563eb", color: "#fff" }}
                      onClick={() => deployBlueprint(bp)}
                    >
                      Deploy Swarm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Live Shared Swarm Blackboard */}
        <Panel
          title="Live Swarm Shared Board"
          description="Watch agents coordinate, share lead context, and trigger handoffs in real time."
          action={
            <button
              type="button"
              className="secondary"
              style={{ fontSize: 12, padding: "5px 10px" }}
              onClick={() => navigate("sequences")}
            >
              <GitBranch size={13} /> View Sequences ({s.sequences.length})
            </button>
          }
        >
          {/* Test Lead Inputs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              marginBottom: 14,
              background: "#f8fafc",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <input
              type="text"
              value={testLeadName}
              onChange={(e) => setTestLeadName(e.target.value)}
              placeholder="Lead Name"
              style={{
                padding: "7px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
              }}
            />
            <input
              type="text"
              value={testLeadPhone}
              onChange={(e) => setTestLeadPhone(e.target.value)}
              placeholder="+91 Phone"
              style={{
                padding: "7px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={runSwarmSimulation}
              disabled={simulating}
              style={{
                padding: "7px 14px",
                borderRadius: 6,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {simulating ? "Running..." : "Simulate"}
            </button>
          </div>

          {/* Blackboard Stream */}
          <div
            style={{
              background: "#0f172a",
              borderRadius: 10,
              padding: 14,
              minHeight: 280,
              maxHeight: 360,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: "rgba(30, 41, 59, 0.85)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#38bdf8", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>
                      {log.agent}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "rgba(37, 99, 235, 0.3)",
                        color: "#93c5fd",
                        fontWeight: 600,
                      }}
                    >
                      {log.channel}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{log.timestamp}</span>
                </div>
                <p style={{ fontSize: 12, color: "#e2e8f0", margin: 0, lineHeight: 1.45 }}>{log.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

