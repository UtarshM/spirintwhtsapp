"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now } from "@/lib/local-workspace";
import { Panel, Badge, Modal } from "./ui";
import {
  MessageCircle,
  ShieldCheck,
  Key,
  Bot,
  FileText,
  Sliders,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Sparkles,
  Phone,
  Copy,
  Upload,
  Info,
  HelpCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import type { AccountIdentity } from "@/lib/workspace-document";

const BOT_PURPOSES = [
  "Website Information",
  "Lead Generation",
  "Sales Assistant",
  "Customer Care",
  "Survey / Feedback",
  "Appointment Booking",
  "Internal Business Functions (HR / IT)",
] as const;

const BOT_TONES = [
  "Professional (Formal and precise responses)",
  "Casual (Relaxed and informal replies)",
  "Premium (Polished concierge-style tone)",
  "Playful (Clear and assertive messaging)",
  "Warm (Empathetic and helpful responses)",
  "Helpful (Short and to-the-point answers)",
] as const;

export default function WhatsAppConfig({
  account,
  notify,
  navigate,
}: {
  account?: AccountIdentity;
  notify: (s: string) => void;
  navigate?: (page: string) => void;
}) {
  const { state: s, update } = useWorkspace();

  const [activeTab, setActiveTab] = useState<"meta" | "automation">("meta");
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Meta connection resource using kind: "channel-setup"
  const metaResource = s.resources.find(
    (r) => r.kind === "channel-setup" && r.data.channel === "WhatsApp"
  );
  const metaData = (metaResource?.data || {}) as Record<string, string>;

  // Form states for Meta Manual Setup
  const [phoneNumber, setPhoneNumber] = useState(metaData.phoneNumber || "+919876543210");
  const [phoneNumberId, setPhoneNumberId] = useState(metaData.phoneNumberId || "104928172948192");
  const [wabaId, setWabaId] = useState(metaData.wabaId || "291847192847192");
  const [appId, setAppId] = useState(metaData.appId || "892184918294");
  const [appSecret, setAppSecret] = useState(metaData.appSecret || "••••••••••••••••••••");
  const [accessToken, setAccessToken] = useState(metaData.accessToken || "EAAGxxxxxxxxxxxxxxxx");
  const [messageDelay, setMessageDelay] = useState(Number(metaData.messageDelay) || 5);
  const [gatewayMode, setGatewayMode] = useState<"managed" | "byok">(
    (metaData.gatewayMode as "managed" | "byok") || "managed"
  );

  // Bot Automation Resource using kind: "bot"
  const botResource = s.resources.find((r) => r.kind === "bot" && r.data.channel === "WhatsApp");
  const botData = (botResource?.data || {}) as Record<string, string>;

  // Form states for Bot Automation
  const [botPurpose, setBotPurpose] = useState(botData.purpose || "Lead Generation");
  const [botTone, setBotTone] = useState(botData.tone || "Professional (Formal and precise responses)");
  const [kbName, setKbName] = useState(botData.kbName || "Leadpilot Customer Knowledge Base");
  const [kbText, setKbText] = useState(
    botData.kbText ||
      "Q: What is Leadpilot?\nA: Leadpilot is an autonomous outreach platform combining WhatsApp, Email, and Indic AI Calling.\n\nQ: Do you offer free trial credits?\nA: Yes, new workspaces receive 500 complimentary testing credits.\n\nQ: How fast do AI voice calls start?\nA: AI calling synthesizes responses in under 120ms with human-like conversation latency."
  );
  const [description, setDescription] = useState(
    botData.description ||
      "Leadpilot is an autonomous B2B revenue and outreach platform specializing in automated multi-channel lead acquisition and qualification."
  );
  const [services, setServices] = useState(
    botData.services || "WhatsApp Automation, AI Voice Calling, Cold Email Infrastructure, Verified Blue Tick Assistance"
  );
  const [expertise, setExpertise] = useState(
    botData.expertise || "We help high-growth businesses 10x their sales pipeline with zero extra sales headcount."
  );
  const [keyMessages, setKeyMessages] = useState(
    botData.keyMessages || "24/7 Response, Indic Language Voice Support, 100% Meta Compliant, Ultra-Low Latency."
  );
  const [greeting, setGreeting] = useState(
    botData.greeting ||
      "Hello! Welcome to Leadpilot. I'm your AI sales assistant. How can I help boost your outreach pipeline today?"
  );
  const [instructions, setInstructions] = useState(
    botData.instructions ||
      "1. Always qualify the lead's company size and monthly outreach volume before scheduling a demo.\n2. If the user asks for pricing, offer the Growth tier (₹4,999/mo) and explain the 5,000 included credits.\n3. Escalate to human handoff immediately if the customer expresses frustration or requests human support."
  );
  const [sendQualifiedLeads, setSendQualifiedLeads] = useState(
    botData.sendQualifiedLeads !== undefined ? botData.sendQualifiedLeads === "true" : true
  );
  const [allowMultipleLeads, setAllowMultipleLeads] = useState(
    botData.allowMultipleLeads !== undefined ? botData.allowMultipleLeads === "true" : false
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isConnected = !!(metaData.phoneNumberId || phoneNumberId);

  const handleTestMetaConnection = async () => {
    if (!accessToken.trim()) {
      notify("Please provide the Permanent Access Token first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "meta",
          credentials: {
            accessToken,
            phoneNumberId,
            wabaId,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        notify("Meta Cloud API verified successfully!");
      } else {
        setTestResult({ success: false, message: data.error || "Connection test failed." });
        notify(data.error || "Meta connection test failed");
      }
    } catch {
      setTestResult({ success: false, message: "Could not reach verification endpoint." });
      notify("Network error testing Meta connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveMetaConfig = () => {
    const updated = update((state) => ({
      ...state,
      resources: [
        ...state.resources.filter((r) => !(r.kind === "channel-setup" && r.data.channel === "WhatsApp")),
        {
          id: metaResource?.id || uid(),
          kind: "channel-setup",
          name: "WhatsApp Meta Config",
          data: {
            channel: "WhatsApp",
            phoneNumber,
            phoneNumberId,
            wabaId,
            appId,
            appSecret,
            accessToken,
            gatewayMode,
            messageDelay: String(messageDelay),
            qualityRating: "High (Green)",
            tier: "Tier 2 (10k / day)",
            verifiedName: s.settings.name || "Leadpilot",
          },
          updatedAt: now(),
        },
      ],
    }));
    if (updated) {
      notify("Meta Cloud API credentials saved successfully!");
      setManualModalOpen(false);
    }
  };

  const handleSaveBotAutomation = () => {
    const updated = update((state) => ({
      ...state,
      resources: [
        ...state.resources.filter((r) => !(r.kind === "bot" && r.data.channel === "WhatsApp")),
        {
          id: botResource?.id || uid(),
          kind: "bot",
          name: "WhatsApp AI Bot Persona",
          data: {
            channel: "WhatsApp",
            purpose: botPurpose,
            tone: botTone,
            kbName,
            kbText,
            description,
            services,
            expertise,
            keyMessages,
            greeting,
            instructions,
            sendQualifiedLeads: String(sendQualifiedLeads),
            allowMultipleLeads: String(allowMultipleLeads),
          },
          updatedAt: now(),
        },
      ],
    }));
    if (updated) notify("WhatsApp Bot Persona and Knowledge Base saved!");
  };

  return (
    <Panel
      title="WhatsApp Configuration"
      description="Meta Cloud API connection and chatbot automation."
      action={
        <div style={{ display: "flex", gap: 8 }}>
          {activeTab === "meta" ? (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() => setManualModalOpen(true)}
              >
                Manual Setup
              </button>
              <button
                type="button"
                className="primary"
                style={{ background: "#25d366" }}
                onClick={() => notify("Launching Meta Embedded Signup flow...")}
              >
                <Plus size={14} style={{ marginRight: 6 }} />
                Connect New Number
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary"
              style={{ background: "#25d366" }}
              onClick={handleSaveBotAutomation}
            >
              <Sparkles size={14} style={{ marginRight: 6 }} />
              Save Bot Settings
            </button>
          )}
        </div>
      }
    >
      {/* Subtab Bar */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
        {[
          { id: "meta", label: "Meta Config" },
          { id: "automation", label: "Automation" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "primary" : "secondary"}
            style={{ padding: "8px 20px", fontSize: 13, borderRadius: "6px 6px 0 0", borderBottom: 0 }}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Security notice banner */}
      <div
        style={{
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
          color: "#475569",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ShieldCheck size={16} style={{ color: "#059669", flexShrink: 0 }} />
        <span>
          Your API credentials are stored securely with AWS KMS encryption. Access tokens and secrets are masked. Never share your access token or app secret.
        </span>
      </div>

      {/* Tab 1: Meta Config */}
      {activeTab === "meta" && (
        <div>
          {/* Gateway Routing Mode Selector */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <strong style={{ fontSize: 14, color: "#0f172a" }}>
                  Gateway Dispatch Architecture
                </strong>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Choose whether your workspace dispatches outreach via our shared verified cloud pool or your dedicated WABA.
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: gatewayMode === "managed" ? "#ecfdf5" : "#e0e7ff",
                  color: gatewayMode === "managed" ? "#065f46" : "#3730a3",
                }}
              >
                {gatewayMode === "managed"
                  ? "LEADPILOT MANAGED POOL"
                  : "DEDICATED BYOK"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                onClick={() => {
                  setGatewayMode("managed");
                  notify("Switched to Leadpilot Managed High-Throughput Gateway");
                }}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border:
                    gatewayMode === "managed"
                      ? "2px solid #059669"
                      : "1px solid #cbd5e1",
                  background: gatewayMode === "managed" ? "#f0fdf4" : "#f8fafc",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  <Zap size={15} style={{ color: "#059669" }} />
                  <span>Leadpilot Managed Gateway (Default)</span>
                </div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                  Pre-verified Meta Cloud API pool. Zero Facebook Business verification delay. Dispatches instantly using wallet credits (₹1.00/msg).
                </div>
              </div>
              <div
                onClick={() => {
                  setGatewayMode("byok");
                  setManualModalOpen(true);
                }}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border:
                    gatewayMode === "byok"
                      ? "2px solid #4f46e5"
                      : "1px solid #cbd5e1",
                  background: gatewayMode === "byok" ? "#eef2ff" : "#f8fafc",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  <Key size={15} style={{ color: "#4f46e5" }} />
                  <span>Enterprise BYOK (Your Own WABA)</span>
                </div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                  Connect your own Meta Business Manager WABA ID, Phone Number ID, and Permanent System User Token with custom display name.
                </div>
              </div>
            </div>
          </div>

          {/* Top Metric Cards */}
          <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">CONNECTED NUMBERS</span>
              <div className="rapid-stat-value">{isConnected ? 1 : 0}</div>
              <span className="rapid-stat-sub">{isConnected ? phoneNumber : "No number active"}</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">MESSAGING TIER</span>
              <div className="rapid-stat-value" style={{ color: "#059669" }}>
                {metaData.tier || "Tier 2 (10k / day)"}
              </div>
              <span className="rapid-stat-sub">Daily conversation limit</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">QUALITY RATING</span>
              <div className="rapid-stat-value" style={{ color: "#059669" }}>
                {metaData.qualityRating || "High (Green)"}
              </div>
              <span className="rapid-stat-sub">Low recipient block rate</span>
            </div>
            <div className="rapid-stat-card">
              <span className="rapid-stat-label">WEBHOOK STATUS</span>
              <div className="rapid-stat-value" style={{ color: "#2563eb" }}>Active</div>
              <span className="rapid-stat-sub">Meta Cloud API listener</span>
            </div>
          </div>

          {/* Connected Number Card */}
          {isConnected ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#ecfdf5",
                      color: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 16, color: "#0f172a" }}>
                      {metaData.verifiedName || s.settings.name || "Leadpilot"}
                    </strong>
                    <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>{phoneNumber}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => setManualModalOpen(true)}
                  >
                    Edit Credentials
                  </button>
                  {navigate && (
                    <button
                      type="button"
                      className="primary"
                      style={{ padding: "6px 14px", fontSize: 12, background: "#059669" }}
                      onClick={() => navigate("verification")}
                    >
                      <Sparkles size={12} style={{ marginRight: 4 }} />
                      Apply for Blue Tick
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Phone Number ID</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>{phoneNumberId}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>WABA ID</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>{wabaId}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Bulk Send Delay</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{messageDelay} seconds</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ecfdf5", color: "#059669", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <MessageCircle size={24} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>No WhatsApp Number Connected Yet</h3>
              <p style={{ fontSize: 13, color: "#64748b", maxWidth: 440, margin: "0 auto 16px" }}>
                Connect your WhatsApp Business account via Meta&apos;s embedded signup or paste your Cloud API credentials manually.
              </p>
              <div style={{ display: "inline-flex", gap: 10 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setManualModalOpen(true)}
                >
                  Manual Setup
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{ background: "#25d366" }}
                  onClick={() => notify("Launching Meta Embedded Signup flow...")}
                >
                  Connect New Number
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Automation (Bot Persona & Knowledge Base) */}
      {activeTab === "automation" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveBotAutomation();
          }}
        >
          {/* Bot Persona */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Bot Persona</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Describe your bot&apos;s role, conversational tone, and response style.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Bot Purpose
                </label>
                <select
                  value={botPurpose}
                  onChange={(e) => setBotPurpose(e.target.value)}
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  {BOT_PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: "#64748b" }}>Define what your bot does for incoming leads</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Tone and Style
                </label>
                <select
                  value={botTone}
                  onChange={(e) => setBotTone(e.target.value)}
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  {BOT_TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: "#64748b" }}>Choose how your bot communicates</span>
              </div>
            </div>
          </section>

          {/* Knowledge Base */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Knowledge Base</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Help your bot learn about your business, products, pricing, and FAQs.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Knowledge Base Name
              </label>
              <input
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Direct FAQs & Product Details (Markdown / Q&A)
              </label>
              <textarea
                rows={5}
                value={kbText}
                onChange={(e) => setKbText(e.target.value)}
                placeholder="Q: What are your business hours?&#10;A: We're open Monday–Friday, 9am–6pm."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "monospace" }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>Type or paste answers to common customer questions</span>
            </div>
          </section>

          {/* Business Overview */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Business Overview</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Briefly describe your company, products, and core value proposition.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Business Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Services / Products
                </label>
                <textarea
                  rows={2}
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Business Expertise
                </label>
                <textarea
                  rows={2}
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Key Messages / USPs
                </label>
                <textarea
                  rows={2}
                  value={keyMessages}
                  onChange={(e) => setKeyMessages(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
            </div>
          </section>

          {/* Greeting & Custom Instructions */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Greeting & Instructions</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              How your bot opens a chat, and the rules it must strictly obey.
            </p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Greeting Message</label>
                <span style={{ fontSize: 11, color: "#64748b" }}>{greeting.length} / 2,000</span>
              </div>
              <textarea
                rows={2}
                maxLength={2000}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>The first message sent when a customer initiates contact</span>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Custom Instructions & Rules</label>
                <span style={{ fontSize: 11, color: "#64748b" }}>{instructions.length} / 3,000</span>
              </div>
              <textarea
                rows={3}
                maxLength={3000}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>Rules the bot should always follow — what to say, what to avoid</span>
            </div>
          </section>

          {/* Leads Handling */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Leads</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              How the bot routes and handles qualified incoming leads.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sendQualifiedLeads}
                  onChange={() => setSendQualifiedLeads(!sendQualifiedLeads)}
                  style={{ marginTop: 2, width: 16, height: 16 }}
                />
                <div>
                  <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>Send qualified leads</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Pass on the leads the bot marks as qualified to Qualified Leads CRM.</span>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allowMultipleLeads}
                  onChange={() => setAllowMultipleLeads(!allowMultipleLeads)}
                  style={{ marginTop: 2, width: 16, height: 16 }}
                />
                <div>
                  <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>Allow multiple leads</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Let the same contact create more than one lead over time.</span>
                </div>
              </label>
            </div>
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="submit"
              className="primary"
              style={{ padding: "8px 24px", background: "#25d366" }}
            >
              Save Bot Configuration
            </button>
          </div>
        </form>
      )}

      {/* Manual Setup Modal (Exact RapidSales Fields) */}
      {manualModalOpen && (
        <Modal
          title="New Meta Configuration"
          close={() => setManualModalOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveMetaConfig();
            }}
          >
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              WhatsApp Business API credentials from your Meta Developer App.
            </p>

            <div className="console-form-grid" style={{ marginBottom: 16 }}>
              <label>
                Phone Number
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+12345678900"
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>The WhatsApp business phone number with country code</span>
              </label>

              <label>
                Message Delay (Seconds)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={messageDelay}
                  onChange={(e) => setMessageDelay(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>Seconds between bulk outreach sends</span>
              </label>

              <label>
                Phone Number ID
                <input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="123456789012345"
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>From WhatsApp → API Setup in Meta Developer Portal</span>
              </label>

              <label>
                WABA ID (WhatsApp Business Account ID)
                <input
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="WhatsApp Business Account ID"
                  required
                />
              </label>

              <label>
                Meta App ID
                <input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Meta App ID"
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>From App Settings → Basic in Meta Developer Dashboard</span>
              </label>

              <label>
                Meta App Secret
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="Meta App Secret"
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>App Secret from App Settings → Basic</span>
              </label>

              <label style={{ gridColumn: "span 2" }}>
                Permanent System User Access Token
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAGxxxxxxxxxxxxxxxx"
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>Permanent system user access token with whatsapp_business_messaging permissions</span>
              </label>
            </div>

            {testResult && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: testResult.success ? "#ecfdf5" : "#fef2f2",
                  color: testResult.success ? "#065f46" : "#991b1b",
                  border: `1px solid ${testResult.success ? "#a7f3d0" : "#fecaca"}`,
                }}
              >
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="secondary"
                disabled={testing}
                onClick={handleTestMetaConnection}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {testing ? "Testing Ping..." : "Test Connection"}
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setTestResult(null);
                    setManualModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{ background: "#25d366" }}
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
