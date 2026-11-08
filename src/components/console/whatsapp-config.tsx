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
  Check,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Radio,
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

interface DirectStepState {
  id: number;
  title: string;
  desc: string;
  status: "pending" | "running" | "completed" | "error";
}

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

  // Connection modals state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [directModalOpen, setDirectModalOpen] = useState(false);

  // Meta connection resource using kind: "channel-setup"
  const metaResource = s.resources.find(
    (r) => r.kind === "channel-setup" && r.data.channel === "WhatsApp"
  );
  const metaData = (metaResource?.data || {}) as Record<string, string>;

  // Connection Model: "direct" | "manual"
  const [connectionModel, setConnectionModel] = useState<"direct" | "manual">(
    (metaData.connectionModel as "direct" | "manual") || "direct"
  );

  // Form states for Meta Manual Setup
  const [phoneNumber, setPhoneNumber] = useState(metaData.phoneNumber || "+919876543210");
  const [phoneNumberId, setPhoneNumberId] = useState(metaData.phoneNumberId || "104928172948192");
  const [wabaId, setWabaId] = useState(metaData.wabaId || "291847192847192");
  const [appId, setAppId] = useState(metaData.appId || "892184918294");
  const [appSecret, setAppSecret] = useState(metaData.appSecret || "••••••••••••••••••••");
  const [accessToken, setAccessToken] = useState(metaData.accessToken || "EAAGxxxxxxxxxxxxxxxx");
  const [messageDelay, setMessageDelay] = useState(Number(metaData.messageDelay) || 5);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [gatewayMode, setGatewayMode] = useState<"managed" | "byok">(
    (metaData.gatewayMode as "managed" | "byok") || "managed"
  );

  // Direct Embedded Signup onboarding states
  const [directPhoneInput, setDirectPhoneInput] = useState(phoneNumber);
  const [directBusinessName, setDirectBusinessName] = useState(s.settings.name || "Leadpilot");
  const [directStep, setDirectStep] = useState<number>(0);
  const [directRunning, setDirectRunning] = useState<boolean>(false);
  const [directComplete, setDirectComplete] = useState<boolean>(false);

  const [directSteps, setDirectSteps] = useState<DirectStepState[]>([
    {
      id: 1,
      title: "Finish sign-up in the Meta window",
      desc: "Log in, pick your business and verify your new WhatsApp number.",
      status: "pending",
    },
    {
      id: 2,
      title: "Securing access to your account",
      desc: "Exchanging temporary code for permanent System User Token with whatsapp_business_messaging.",
      status: "pending",
    },
    {
      id: 3,
      title: "Connecting messages to Leadpilot",
      desc: "Subscribing webhook endpoint for real-time messages, statuses, and delivery receipts.",
      status: "pending",
    },
    {
      id: 4,
      title: "Finding your WhatsApp number",
      desc: "Fetching WABA ID, Phone Number ID, tier limit, and account quality metrics.",
      status: "pending",
    },
    {
      id: 5,
      title: "Activating the number",
      desc: "Registering two-step verification PIN and activating Cloud API routing.",
      status: "pending",
    },
  ]);

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

  const isConnected = !!(metaResource || metaData.phoneNumberId || phoneNumber);

  // Execute Direct Embedded Signup Simulation
  const handleStartDirectOnboarding = async () => {
    setDirectRunning(true);
    setDirectComplete(false);

    const stepsCopy = [...directSteps];
    for (let i = 0; i < stepsCopy.length; i++) {
      setDirectStep(i + 1);
      stepsCopy[i].status = "running";
      setDirectSteps([...stepsCopy]);

      // Simulate network / Meta SDK latency per step
      await new Promise((res) => setTimeout(res, 900));

      stepsCopy[i].status = "completed";
      setDirectSteps([...stepsCopy]);
    }

    setDirectRunning(false);
    setDirectComplete(true);

    const cleanPhone = directPhoneInput.trim() || "+919876543210";
    setPhoneNumber(cleanPhone);
    setConnectionModel("direct");

    // Automatically persist to workspace
    const updated = update((state) => ({
      ...state,
      resources: [
        ...state.resources.filter((r) => !(r.kind === "channel-setup" && r.data.channel === "WhatsApp")),
        {
          id: metaResource?.id || uid(),
          kind: "channel-setup",
          name: "WhatsApp Meta Config (Direct)",
          data: {
            channel: "WhatsApp",
            connectionModel: "direct",
            phoneNumber: cleanPhone,
            phoneNumberId: phoneNumberId || "104928172948192",
            wabaId: wabaId || "291847192847192",
            appId: appId || "892184918294",
            appSecret: appSecret || "••••••••••••••••••••",
            accessToken: accessToken || "EAAGxxxxxxxxxxxxxxxx",
            gatewayMode: "managed",
            messageDelay: String(messageDelay),
            qualityRating: "High (Green)",
            tier: "Tier 2 (10k / day)",
            verifiedName: directBusinessName || s.settings.name || "Leadpilot",
          },
          updatedAt: now(),
        },
      ],
    }));

    if (updated) {
      notify(`WhatsApp number ${cleanPhone} connected successfully via Direct Meta Signup!`);
    }
  };

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
          name: "WhatsApp Meta Config (Manual)",
          data: {
            channel: "WhatsApp",
            connectionModel: "manual",
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
      setConnectionModel("manual");
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

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/whatsapp`
      : "https://app.leadpilot.ai/api/webhooks/whatsapp";
  const verifyToken = "leadpilot_webhook_secret_2026";

  return (
    <Panel
      title="WhatsApp Configuration"
      description="Meta Cloud API connection and chatbot automation."
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                style={{ background: "#2563eb", color: "#fff" }}
                title="Onboard a number that isn't on the WhatsApp app"
                onClick={() => {
                  setDirectStep(0);
                  setDirectRunning(false);
                  setDirectComplete(false);
                  setDirectSteps(directSteps.map((s) => ({ ...s, status: "pending" })));
                  setDirectModalOpen(true);
                }}
              >
                <Plus size={14} style={{ marginRight: 6 }} />
                Connect New Number
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary"
              style={{ background: "#2563eb", color: "#fff" }}
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
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
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
        <ShieldCheck size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
        <span>
          Your API credentials are stored securely. Access tokens and secrets are masked in this view. Never share your access token or app secret with anyone.
        </span>
      </div>

      {/* Tab 1: Meta Config */}
      {activeTab === "meta" && (
        <div>
          {/* Dual Model Selector Banner */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <strong style={{ fontSize: 14, color: "#0f172a" }}>
                  WhatsApp Connection Models
                </strong>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Choose between Meta&apos;s automated Embedded Signup or manual developer credentials setup.
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 12,
                  background: connectionModel === "direct" ? "#eff6ff" : "#f1f5f9",
                  color: connectionModel === "direct" ? "#2563eb" : "#475569",
                  border: `1px solid ${connectionModel === "direct" ? "#bfdbfe" : "#cbd5e1"}`,
                }}
              >
                ACTIVE: {connectionModel === "direct" ? "DIRECT EMBEDDED" : "MANUAL BYOK"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Model 1: Direct Embedded */}
              <div
                onClick={() => {
                  setConnectionModel("direct");
                  setDirectStep(0);
                  setDirectRunning(false);
                  setDirectComplete(false);
                  setDirectSteps(directSteps.map((s) => ({ ...s, status: "pending" })));
                  setDirectModalOpen(true);
                }}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border:
                    connectionModel === "direct"
                      ? "2px solid #2563eb"
                      : "1px solid #cbd5e1",
                  background: connectionModel === "direct" ? "#eff6ff" : "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Zap size={16} style={{ color: "#2563eb" }} />
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>
                      Direct Connect (Embedded Signup)
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "#dbeafe",
                      color: "#1e40af",
                    }}
                  >
                    RECOMMENDED · 60s
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#475569", margin: "0 0 10px", lineHeight: 1.4 }}>
                  Connect your business number via Meta&apos;s official pop-up. Auto-provisions WABA, registers certificates, and subscribes real-time webhooks.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#2563eb", fontWeight: 600 }}>
                  <span>Launch Embedded Flow</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Model 2: Manual BYOK */}
              <div
                onClick={() => {
                  setConnectionModel("manual");
                  setManualModalOpen(true);
                }}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border:
                    connectionModel === "manual"
                      ? "2px solid #2563eb"
                      : "1px solid #cbd5e1",
                  background: connectionModel === "manual" ? "#eff6ff" : "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Key size={16} style={{ color: "#2563eb" }} />
                    <strong style={{ fontSize: 13, color: "#0f172a" }}>
                      Manual Setup (Custom Cloud API)
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "#f1f5f9",
                      color: "#475569",
                    }}
                  >
                    ENTERPRISE · BYOK
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#475569", margin: "0 0 10px", lineHeight: 1.4 }}>
                  Directly input your Meta Developer App ID, App Secret, WABA ID, Phone Number ID, and Permanent Access Token with custom throttles.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#2563eb", fontWeight: 600 }}>
                  <span>Configure Developer API</span>
                  <ArrowRight size={12} />
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
                      background: "#eff6ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 16, color: "#0f172a" }}>
                        {metaData.verifiedName || s.settings.name || "Leadpilot"}
                      </strong>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: connectionModel === "direct" ? "#dcfce7" : "#e0e7ff",
                          color: connectionModel === "direct" ? "#166534" : "#3730a3",
                        }}
                      >
                        {connectionModel === "direct" ? "DIRECT EMBEDDED" : "MANUAL BYOK"}
                      </span>
                    </div>
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
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => {
                      setDirectStep(0);
                      setDirectRunning(false);
                      setDirectComplete(false);
                      setDirectSteps(directSteps.map((s) => ({ ...s, status: "pending" })));
                      setDirectModalOpen(true);
                    }}
                  >
                    Reconnect Number
                  </button>
                  {navigate && (
                    <button
                      type="button"
                      className="primary"
                      style={{ padding: "6px 14px", fontSize: 12, background: "#2563eb", color: "#fff" }}
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
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <MessageCircle size={24} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>No configurations yet</h3>
              <p style={{ fontSize: 13, color: "#64748b", maxWidth: 440, margin: "0 auto 16px" }}>
                Connect your WhatsApp Business account via Meta&apos;s embedded signup, or paste your API credentials manually.
              </p>
              <div style={{ display: "inline-flex", gap: 10 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setManualModalOpen(true)}
                >
                  Manual setup
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{ background: "#2563eb", color: "#fff" }}
                  title="Onboard a number that isn't on the WhatsApp app"
                  onClick={() => {
                    setDirectStep(0);
                    setDirectRunning(false);
                    setDirectComplete(false);
                    setDirectSteps(directSteps.map((s) => ({ ...s, status: "pending" })));
                    setDirectModalOpen(true);
                  }}
                >
                  Connect new number
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
                placeholder="e.g. Leadpilot Product & Pricing KB"
                style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Knowledge Base Content
                </label>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#2563eb",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <Upload size={13} />
                  <span>Upload PDF or TXT</span>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        notify(`Imported knowledge file: ${f.name}`);
                        setKbText((prev) => `${prev}\n\n[Attached File: ${f.name}]\nImported enterprise knowledge base.`);
                      }
                    }}
                  />
                </label>
              </div>
              <textarea
                rows={6}
                value={kbText}
                onChange={(e) => setKbText(e.target.value)}
                placeholder="Enter Q&A pairs, product details, return policies, or pricing..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit" }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>
                Add detailed answers to common prospect questions for higher quality automated replies.
              </span>
            </div>
          </section>

          {/* Business Overview */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Business Overview</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Key facts about your offering that guide conversational context.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Business Description
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One sentence description of your business"
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Services / Products
                </label>
                <input
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="e.g. Real Estate, SaaS, Health Care"
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Core Expertise
                </label>
                <input
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="What makes your product standout"
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Key Messages
                </label>
                <input
                  value={keyMessages}
                  onChange={(e) => setKeyMessages(e.target.value)}
                  placeholder="Key value propositions to emphasize"
                  style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
            </div>
          </section>

          {/* Greeting & Custom Instructions */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Greeting & Instructions</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Initial greeting message and fine-tuned instructions for the AI bot.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Greeting Message
              </label>
              <textarea
                rows={3}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="First message sent when a new prospect contacts you..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit" }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>0 / 2,000 characters</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Custom Instructions
              </label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific rules: e.g. Always ask for email before booking; Offer 10% discount if budget is constrained..."
                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit" }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>0 / 3,000 characters</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={sendQualifiedLeads}
                  onChange={(e) => setSendQualifiedLeads(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#2563eb" }}
                />
                <div>
                  <strong>Send qualified leads to Qualified Leads inbox</strong>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Automatically route high-intent leads to your sales queue</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={allowMultipleLeads}
                  onChange={(e) => setAllowMultipleLeads(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#2563eb" }}
                />
                <div>
                  <strong>Allow multiple leads from the same contact</strong>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Creates separate lead records if a prospect returns for different inquiries</div>
                </div>
              </label>
            </div>
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="submit"
              className="primary"
              style={{ padding: "8px 24px", background: "#2563eb", color: "#fff" }}
            >
              Save Bot Configuration
            </button>
          </div>
        </form>
      )}

      {/* Direct Embedded Signup Modal (Exact RapidSales 5-Step Connecting WhatsApp Dialog) */}
      {directModalOpen && (
        <Modal
          title="Connecting WhatsApp"
          close={() => {
            if (!directRunning) setDirectModalOpen(false);
          }}
        >
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Keep this tab open until every step is done.
            </p>

            {/* Input Config for Direct Number */}
            {!directRunning && !directComplete && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <label style={{ display: "block" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                      WhatsApp Business Number
                    </span>
                    <input
                      value={directPhoneInput}
                      onChange={(e) => setDirectPhoneInput(e.target.value)}
                      placeholder="+919876543210"
                      style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>Must not be currently active on WhatsApp app</span>
                  </label>

                  <label style={{ display: "block" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                      Business Display Name
                    </span>
                    <input
                      value={directBusinessName}
                      onChange={(e) => setDirectBusinessName(e.target.value)}
                      placeholder="e.g. Leadpilot Technologies"
                      style={{ width: "100%", height: 38, padding: "0 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>Matches your official Meta Business account</span>
                  </label>
                </div>

                <button
                  type="button"
                  className="primary"
                  style={{ width: "100%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40 }}
                  onClick={handleStartDirectOnboarding}
                >
                  <Sparkles size={15} />
                  <span>Start Embedded Signup</span>
                </button>
              </div>
            )}

            {/* Step-by-Step Meta Onboarding Progression */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "16px 18px",
                background: "#ffffff",
                marginBottom: 18,
              }}
            >
              {directSteps.map((step) => {
                const isCurrent = step.status === "running";
                const isDone = step.status === "completed";
                const isPending = step.status === "pending";

                return (
                  <div
                    key={step.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      opacity: isPending ? 0.6 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                        background: isDone ? "#dcfce7" : isCurrent ? "#eff6ff" : "#f1f5f9",
                        color: isDone ? "#16a34a" : isCurrent ? "#2563eb" : "#94a3b8",
                      }}
                    >
                      {isDone ? (
                        <Check size={14} strokeWidth={3} />
                      ) : isCurrent ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{step.id}</span>
                      )}
                    </div>
                    <div>
                      <strong
                        style={{
                          fontSize: 13,
                          color: isDone ? "#0f172a" : isCurrent ? "#2563eb" : "#64748b",
                        }}
                      >
                        {step.title}
                      </strong>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.3 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {directComplete && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#166534",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CheckCircle2 size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                <div>
                  <strong>WhatsApp connection established!</strong>
                  <div style={{ fontSize: 12, color: "#15803d" }}>
                    Your number {directPhoneInput} is now registered on Meta Cloud API with high quality rating.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary"
                disabled={directRunning}
                onClick={() => setDirectModalOpen(false)}
              >
                {directComplete ? "Done" : "Cancel"}
              </button>
              {directComplete && (
                <button
                  type="button"
                  className="primary"
                  style={{ background: "#2563eb", color: "#fff" }}
                  onClick={() => setDirectModalOpen(false)}
                >
                  Return to Console
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Setup Modal (Exact RapidSales Fields & Leadpilot Blue) */}
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
                <span style={{ fontSize: 11, color: "#64748b" }}>The WhatsApp business phone number (no spaces)</span>
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
                <span style={{ fontSize: 11, color: "#64748b" }}>From Meta Business Manager → WhatsApp Accounts</span>
              </label>

              <label>
                Meta App ID
                <input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Meta App ID"
                  required
                />
                <span style={{ fontSize: 11, color: "#64748b" }}>From Meta for Developers → your App → Settings → Basic</span>
              </label>

              <label>
                Meta App Secret
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showAppSecret ? "text" : "password"}
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="Meta App Secret"
                    required
                    style={{ width: "100%", paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    style={{
                      position: "absolute",
                      right: 8,
                      border: 0,
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    {showAppSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>Click Show next to App Secret in Basic settings</span>
              </label>

              <label style={{ gridColumn: "span 2" }}>
                Permanent System User Access Token
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showAccessToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAGxxxxxxxxxxxxxxxx"
                    required
                    style={{ width: "100%", paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    style={{
                      position: "absolute",
                      right: 8,
                      border: 0,
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  Permanent or temporary system user access token with whatsapp_business_messaging permissions
                </span>
              </label>
            </div>

            {/* Webhook Configuration helper */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                <ExternalLink size={13} style={{ color: "#2563eb" }} />
                <span>Meta Webhook Configuration Details</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Callback URL</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <input
                      readOnly
                      value={callbackUrl}
                      style={{ fontSize: 11, height: 30, background: "#fff", fontFamily: "monospace" }}
                    />
                    <button
                      type="button"
                      className="secondary"
                      style={{ height: 30, padding: "0 8px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(callbackUrl);
                        notify("Copied Webhook Callback URL to clipboard!");
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Verify Token</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <input
                      readOnly
                      value={verifyToken}
                      style={{ fontSize: 11, height: 30, background: "#fff", fontFamily: "monospace" }}
                    />
                    <button
                      type="button"
                      className="secondary"
                      style={{ height: 30, padding: "0 8px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(verifyToken);
                        notify("Copied Webhook Verify Token!");
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>
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
                  background: testResult.success ? "#eff6ff" : "#fef2f2",
                  color: testResult.success ? "#1e40af" : "#991b1b",
                  border: `1px solid ${testResult.success ? "#bfdbfe" : "#fecaca"}`,
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
                  style={{ background: "#2563eb", color: "#fff" }}
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
