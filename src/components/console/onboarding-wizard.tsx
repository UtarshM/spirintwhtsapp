"use client";
import { useState } from "react";
import {
  Sparkles,
  Check,
  ArrowRight,
  Building2,
  Globe,
  Briefcase,
  Bot,
  MessageSquare,
  Mail,
  Phone,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { INDUSTRY_PACKS, type IndustryPack } from "@/lib/industry-packs";
import { useWorkspace } from "../local-provider";
import { uid, now, type LocalTemplate } from "@/lib/local-workspace";

export default function OnboardingWizard({
  isOpen,
  onClose,
  notify,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  notify: (msg: string) => void;
  onNavigate: (route: string) => void;
}) {
  const { state: s, update } = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("ecommerce");
  const [companyName, setCompanyName] = useState<string>(s.settings?.name || "My Business");
  const [website, setWebsite] = useState<string>("https://mybusiness.com");
  const [channels, setChannels] = useState<{ wa: boolean; voice: boolean; email: boolean }>({
    wa: true,
    voice: true,
    email: true,
  });
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const currentPack = INDUSTRY_PACKS.find((p) => p.id === selectedIndustry) || INDUSTRY_PACKS[0];

  const handleApplyPack = () => {
    setIsApplying(true);
    setTimeout(() => {
      // 1. Seed Templates
      const newTemplates: LocalTemplate[] = currentPack.templates.map((t) => ({
        ...t,
        id: uid(),
        updatedAt: now(),
      }));

      // 2. Seed AI Calling Agent
      const newAgent = {
        id: uid(),
        name: currentPack.agentPrompt.name,
        language: "English" as const,
        voice: currentPack.agentPrompt.voice,
        instructions: currentPack.agentPrompt.instructions.replaceAll("{{company}}", companyName),
        knowledge: `Company Name: ${companyName}\nWebsite: ${website}\nIndustry: ${currentPack.name}\nStandard Working Hours: 9 AM to 7 PM IST Monday to Saturday.`,
        qualification: currentPack.agentPrompt.qualification,
        maxDuration: 180,
        concurrency: 5,
        handoff: "Human sales representative",
        updatedAt: now(),
        agentType: "Conversational" as const,
        greeting: `Hello! Calling from ${companyName}. Do you have two quick minutes?`,
      };

      // 3. Welcome Transaction
      const welcomeTx = {
        id: "tx_welcome_" + Date.now(),
        kind: "Sample top-up" as const,
        credits: 500,
        at: now(),
        reference: `Starter Grant: 500 Outreach Credits (${currentPack.name} Pack)`,
      };

      // 4. Update Workspace State
      update((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          name: companyName,
        },
        templates: [...newTemplates, ...prev.templates],
        agents: [newAgent, ...prev.agents],
        transactions: [welcomeTx, ...prev.transactions],
      }));

      notify(`🎉 Setup Complete! Activated ${currentPack.name} pack with 500 complimentary credits.`);
      setIsApplying(false);
      onClose();
      onNavigate("templates");
    }, 600);
  };

  return (
    <div className="onboarding-modal-overlay" style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(6px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: 16,
        maxWidth: 760,
        width: "100%",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#fff",
          padding: "24px 28px",
          position: "relative",
        }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: "0.5px" }}>
            <Sparkles size={13} style={{ color: "#fbbf24" }} />
            <span>BUSINESS ONBOARDING WIZARD</span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px 0", letterSpacing: "-0.4px" }}>
            Tailor Your Scalezix Outreach Machine
          </h2>
          <p style={{ fontSize: 13, color: "#c7d2fe", margin: 0 }}>
            Choose your industry to automatically load pre-approved WhatsApp templates, AI voice scripts, and 500 free outreach credits.
          </p>

          {/* Stepper Dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  background: step >= s ? "#38bdf8" : "rgba(255,255,255,0.2)",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: "28px", maxHeight: "65vh", overflowY: "auto" }}>
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>
                  Step 1: Select Your Business Industry
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  We will configure your templates, compliance rules, and AI caller persona to match your business sector.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
                {INDUSTRY_PACKS.map((pack) => {
                  const isSelected = selectedIndustry === pack.id;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedIndustry(pack.id)}
                      style={{
                        padding: "16px",
                        borderRadius: 12,
                        border: isSelected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                        background: isSelected ? "#eef2ff" : "#f8fafc",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 28 }}>{pack.icon}</span>
                        {isSelected && (
                          <div style={{ background: "#4f46e5", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{pack.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{pack.tagline}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>
                  Step 2: Business Identity & Outreach Channels
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Personalize the variable placeholders (<code>&#123;&#123;company&#125;&#125;</code>) in all generated message templates.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Company / Startup Name
                  </label>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 12px", background: "#f8fafc" }}>
                    <Building2 size={16} style={{ color: "#64748b", marginRight: 8 }} />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. UrbanKicks / TechFlow"
                      style={{ border: "none", background: "transparent", height: 40, width: "100%", fontSize: 13, color: "#0f172a", outline: "none" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Official Website
                  </label>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 12px", background: "#f8fafc" }}>
                    <Globe size={16} style={{ color: "#64748b", marginRight: 8 }} />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://mybusiness.com"
                      style={{ border: "none", background: "transparent", height: 40, width: "100%", fontSize: 13, color: "#0f172a", outline: "none" }}
                    />
                  </div>
                </div>
              </div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                Select Active Outreach Channels
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: channels.wa ? "1.5px solid #059669" : "1px solid #cbd5e1",
                    background: channels.wa ? "#ecfdf5" : "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={channels.wa}
                    onChange={(e) => setChannels({ ...channels, wa: e.target.checked })}
                  />
                  <MessageSquare size={16} style={{ color: "#059669" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>WhatsApp API</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: channels.voice ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                    background: channels.voice ? "#eef2ff" : "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={channels.voice}
                    onChange={(e) => setChannels({ ...channels, voice: e.target.checked })}
                  />
                  <Phone size={16} style={{ color: "#4f46e5" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>AI Calling</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: channels.email ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                    background: channels.email ? "#eff6ff" : "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                  />
                  <Mail size={16} style={{ color: "#2563eb" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Cold Email</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>
                  Step 3: Review Auto-Provisioned Assets
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Here is the bundle that will be automatically installed in your workspace.
                </p>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{currentPack.icon}</span>
                  <div>
                    <strong style={{ fontSize: 14, color: "#0f172a" }}>{currentPack.name} Template Suite</strong>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{currentPack.templates.length} pre-formatted templates with buttons & quick replies</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {currentPack.templates.map((t, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#334155" }}>
                      <Check size={14} style={{ color: "#10b981" }} />
                      <span style={{ fontWeight: 600, color: "#4f46e5" }}>[{t.channel}]</span>
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "#22c55e", color: "#fff", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Starter Grant Included</div>
                    <div style={{ fontSize: 11, color: "#166534" }}>500 trial outreach credits will be added to your workspace wallet</div>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#15803d" }}>₹500.00</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div style={{
          padding: "16px 28px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                style={{
                  background: "#4f46e5",
                  border: "none",
                  padding: "9px 20px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyPack}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
              >
                <Sparkles size={16} />
                <span>{isApplying ? "Provisioning Workspace..." : "Apply Pack & Launch Workspace"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

