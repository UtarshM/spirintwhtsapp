"use client";
import { useState } from "react";
import { useWorkspace } from "../local-provider";
import { uid, now } from "@/lib/local-workspace";
import { Panel, Badge, Modal } from "./ui";
import {
  Building2,
  Users,
  TrendingUp,
  CreditCard,
  Plus,
  Search,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PhoneCall,
  MessageCircle,
  Mail,
  Sliders,
  DollarSign,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Award,
  Activity,
  Server,
  Zap,
  Lock,
  PieChart,
  History,
} from "lucide-react";

export interface ClientTenant {
  id: string;
  name: string;
  category: string;
  founderName: string;
  founderEmail: string;
  plan: "Starter" | "Growth" | "Enterprise";
  mrrPaise: number;
  creditsBalance: number;
  status: "Active" | "Trial" | "Suspended";
  seatsCount: number;
  hasWhatsApp: boolean;
  hasVoice: boolean;
  hasEmail: boolean;
  hasBlueTick: boolean;
  joinedAt: string;
}

const DEFAULT_TENANTS: ClientTenant[] = [
  {
    id: "tenant-1",
    name: "UrbanKicks E-Commerce",
    category: "D2C & Retail",
    founderName: "Rohan Verma",
    founderEmail: "rohan@urbankicks.in",
    plan: "Growth",
    mrrPaise: 499900,
    creditsBalance: 8420,
    status: "Active",
    seatsCount: 4,
    hasWhatsApp: true,
    hasVoice: true,
    hasEmail: true,
    hasBlueTick: true,
    joinedAt: "2026-09-12",
  },
  {
    id: "tenant-2",
    name: "FinPulse Advisors",
    category: "Fintech & Loans",
    founderName: "Sneha Patel",
    founderEmail: "sneha@finpulse.co",
    plan: "Enterprise",
    mrrPaise: 1499900,
    creditsBalance: 24500,
    status: "Active",
    seatsCount: 9,
    hasWhatsApp: true,
    hasVoice: true,
    hasEmail: true,
    hasBlueTick: false,
    joinedAt: "2026-08-05",
  },
  {
    id: "tenant-3",
    name: "NextEdu Academy",
    category: "EdTech & Courses",
    founderName: "Ankit Sharma",
    founderEmail: "ankit@nextedu.org",
    plan: "Starter",
    mrrPaise: 199900,
    creditsBalance: 1200,
    status: "Trial",
    seatsCount: 2,
    hasWhatsApp: true,
    hasVoice: false,
    hasEmail: true,
    hasBlueTick: false,
    joinedAt: "2026-10-28",
  },
  {
    id: "tenant-4",
    name: "PrimeRealty Ventures",
    category: "Real Estate Brokerage",
    founderName: "Vikram Malhotra",
    founderEmail: "vikram@primerealty.in",
    plan: "Growth",
    mrrPaise: 499900,
    creditsBalance: 4100,
    status: "Active",
    seatsCount: 5,
    hasWhatsApp: true,
    hasVoice: true,
    hasEmail: true,
    hasBlueTick: false,
    joinedAt: "2026-10-02",
  },
];

export default function SaaSAdmin({
  notify,
  navigate,
}: {
  notify: (s: string) => void;
  navigate?: (page: string) => void;
}) {
  const { state: s, update } = useWorkspace();

  const [tenants, setTenants] = useState<ClientTenant[]>(() => {
    const saved = s.resources.find((r) => r.kind === "channel-setup" && r.data.channel === "SaaS-Tenants");
    if (saved?.data.tenantsJson) {
      try {
        return JSON.parse(saved.data.tenantsJson);
      } catch {
        // fallback
      }
    }
    return DEFAULT_TENANTS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("");
  const [newTenantModalOpen, setNewTenantModalOpen] = useState(false);
  const [topUpModalTenant, setTopUpModalTenant] = useState<ClientTenant | null>(null);
  const [topUpCredits, setTopUpCredits] = useState(2000);
  const [activeTab, setActiveTab] = useState<"tenants" | "financials" | "gateways" | "audit">("tenants");

  // New tenant form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCategory, setNewCategory] = useState("D2C & Retail");
  const [newFounderName, setNewFounderName] = useState("");
  const [newFounderEmail, setNewFounderEmail] = useState("");
  const [newPlan, setNewPlan] = useState<"Starter" | "Growth" | "Enterprise">("Growth");
  const [initialCredits, setInitialCredits] = useState(1000);

  const saveTenants = (updatedList: ClientTenant[]) => {
    setTenants(updatedList);
    update((state) => ({
      ...state,
      resources: [
        ...state.resources.filter((r) => !(r.kind === "channel-setup" && r.data.channel === "SaaS-Tenants")),
        {
          id: uid(),
          kind: "channel-setup",
          name: "SaaS Multi-Tenant Registry",
          data: {
            channel: "SaaS-Tenants",
            tenantsJson: JSON.stringify(updatedList),
          },
          updatedAt: now(),
        },
      ],
    }));
  };

  const handleCreateTenant = () => {
    if (!newCompanyName.trim() || !newFounderEmail.trim()) {
      notify("Please provide company name and founder email");
      return;
    }
    const mrr = newPlan === "Starter" ? 199900 : newPlan === "Growth" ? 499900 : 1499900;
    const newT: ClientTenant = {
      id: `tenant-${Date.now()}`,
      name: newCompanyName.trim(),
      category: newCategory,
      founderName: newFounderName.trim() || "Founder",
      founderEmail: newFounderEmail.trim(),
      plan: newPlan,
      mrrPaise: mrr,
      creditsBalance: Number(initialCredits) || 1000,
      status: "Active",
      seatsCount: 1,
      hasWhatsApp: true,
      hasVoice: newPlan !== "Starter",
      hasEmail: true,
      hasBlueTick: false,
      joinedAt: new Date().toISOString().slice(0, 10),
    };

    saveTenants([...tenants, newT]);
    setNewTenantModalOpen(false);
    setNewCompanyName("");
    setNewFounderName("");
    setNewFounderEmail("");
    notify(`Provisioned new workspace for ${newT.name}! Invitation sent to ${newT.founderEmail}`);
  };

  const handleTopUpCredits = () => {
    if (!topUpModalTenant) return;
    const updated = tenants.map((t) =>
      t.id === topUpModalTenant.id ? { ...t, creditsBalance: t.creditsBalance + Number(topUpCredits) } : t
    );
    saveTenants(updated);
    notify(`Credited ${topUpCredits} credits to ${topUpModalTenant.name}`);
    setTopUpModalTenant(null);
  };

  const handleToggleStatus = (tenantId: string) => {
    const updated = tenants.map((t) =>
      t.id === tenantId
        ? { ...t, status: (t.status === "Active" ? "Suspended" : "Active") as ClientTenant["status"] }
        : t
    );
    saveTenants(updated);
    notify("Tenant account status updated");
  };

  // Metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "Active").length;
  const totalMrrPaise = tenants.filter((t) => t.status === "Active").reduce((sum, t) => sum + t.mrrPaise, 0);
  const totalMrrRupees = Math.round(totalMrrPaise / 100);
  const totalClientCredits = tenants.reduce((sum, t) => sum + t.creditsBalance, 0);

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.founderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.founderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = !selectedPlanFilter || t.plan === selectedPlanFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <Panel
      title="SaaS Founder & Platform Management"
      description="Manage all onboarded Startups, Companies, and MSMEs using your Leadpilot outreach platform, subscriptions, and wholesale margins."
      action={
        <button
          type="button"
          className="primary"
          style={{ background: "#4f46e5" }}
          onClick={() => setNewTenantModalOpen(true)}
        >
          <Plus size={14} style={{ marginRight: 6 }} />
          Provision New Client Company
        </button>
      }
    >
      {/* Platform Owner Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          borderRadius: 12,
          padding: "24px 28px",
          color: "#fff",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
              <Shield size={14} style={{ color: "#818cf8" }} />
              <span>PLATFORM FOUNDER DASHBOARD · B2B SAAS MODE</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
              Leadpilot Outreach SaaS Ecosystem
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              You are the platform owner. Each company below runs inside their own fully isolated private workspace with independent campaigns, dedicated WhatsApp numbers, AI voice agents, and lead CRM.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "14px 20px",
                borderRadius: 10,
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>TOTAL MONTHLY MRR</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>
                ₹{totalMrrRupees.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>from {activeTenants} active businesses</div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "14px 20px",
                borderRadius: 10,
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>CLIENT CREDIT POOL</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#818cf8" }}>
                {totalClientCredits.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>active credits in circulation</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="rapid-stat-cards-grid" style={{ marginBottom: 20 }}>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">TOTAL CLIENT BUSINESSES</span>
          <div className="rapid-stat-value">{totalTenants}</div>
          <span className="rapid-stat-sub">{activeTenants} active · Startups & MSMEs</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">MONTHLY SUBSCRIPTIONS</span>
          <div className="rapid-stat-value" style={{ color: "#059669" }}>
            ₹{totalMrrRupees.toLocaleString("en-IN")}
          </div>
          <span className="rapid-stat-sub">Recurring monthly SaaS revenue</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">PLATFORM USAGE MARGIN</span>
          <div className="rapid-stat-value" style={{ color: "#7c3aed" }}>~54%</div>
          <span className="rapid-stat-sub">Markup over wholesale API costs</span>
        </div>
        <div className="rapid-stat-card">
          <span className="rapid-stat-label">BLUE TICK CLIENTS</span>
          <div className="rapid-stat-value" style={{ color: "#2563eb" }}>
            {tenants.filter((t) => t.hasBlueTick).length}
          </div>
          <span className="rapid-stat-sub">Verified Meta green badge active</span>
        </div>
      </div>

      {/* Super Admin Control Center Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
        <button
          type="button"
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "tenants" ? "2px solid #4f46e5" : "2px solid transparent",
            color: activeTab === "tenants" ? "#4f46e5" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={() => setActiveTab("tenants")}
        >
          <Building2 size={16} />
          <span>Client Workspaces ({tenants.length})</span>
        </button>
        <button
          type="button"
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "financials" ? "2px solid #4f46e5" : "2px solid transparent",
            color: activeTab === "financials" ? "#4f46e5" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={() => setActiveTab("financials")}
        >
          <TrendingUp size={16} />
          <span>Revenue & Margin Engine</span>
        </button>
        <button
          type="button"
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "gateways" ? "2px solid #4f46e5" : "2px solid transparent",
            color: activeTab === "gateways" ? "#4f46e5" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={() => setActiveTab("gateways")}
        >
          <Server size={16} />
          <span>Omnichannel Gateway Infrastructure</span>
        </button>
        <button
          type="button"
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "audit" ? "2px solid #4f46e5" : "2px solid transparent",
            color: activeTab === "audit" ? "#4f46e5" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={() => setActiveTab("audit")}
        >
          <History size={16} />
          <span>Audit & Access Logs</span>
        </button>
      </div>

      {/* TAB 1: CLIENT TENANTS DIRECTORY */}
      {activeTab === "tenants" && (
        <>
          {/* Filter and Search Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 13 }}
              >
                <option value="">All Subscription Plans</option>
                <option value="Starter">Starter (₹1,999/mo)</option>
                <option value="Growth">Growth (₹4,999/mo)</option>
                <option value="Enterprise">Enterprise (₹14,999/mo)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
                <input
                  placeholder="Search by company, founder, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: 38, paddingLeft: 34, paddingRight: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, width: 280 }}
                />
              </div>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="table-scroll" style={{ marginBottom: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Client Business</th>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Plan & MRR</th>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Credit Balance</th>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Active Channels</th>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Team Seats</th>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Status</th>
                  <th style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "right" }}>Founder Controls</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "#e0e7ff",
                            color: "#4338ca",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{t.name}</span>
                            {t.hasBlueTick && (
                              <span
                                title="Verified Official Business Account"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 14,
                                  height: 14,
                                  borderRadius: "50%",
                                  background: "#25d366",
                                  color: "#fff",
                                  fontSize: 9,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {t.founderName} · {t.founderEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{t.plan}</div>
                      <div style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                        ₹{Math.round(t.mrrPaise / 100).toLocaleString("en-IN")}/mo
                      </div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontWeight: 700, color: t.creditsBalance < 2000 ? "#d97706" : "#0f172a" }}>
                        {t.creditsBalance.toLocaleString()} credits
                      </div>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#4f46e5",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          marginTop: 2,
                        }}
                        onClick={() => setTopUpModalTenant(t)}
                      >
                        + Add Credits
                      </button>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        {t.hasWhatsApp && (
                          <span
                            title="WhatsApp Cloud API Connected"
                            style={{
                              display: "inline-flex",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "#ecfdf5",
                              color: "#059669",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            WA
                          </span>
                        )}
                        {t.hasVoice && (
                          <span
                            title="AI Voice Calling Active"
                            style={{
                              display: "inline-flex",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "#f5f3ff",
                              color: "#7c3aed",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            Voice
                          </span>
                        )}
                        {t.hasEmail && (
                          <span
                            title="Cold Email Outreach Active"
                            style={{
                              display: "inline-flex",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "#eff6ff",
                              color: "#2563eb",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            Email
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontSize: 13, color: "#334155" }}>
                        {t.seatsCount} / {t.plan === "Starter" ? 2 : t.plan === "Growth" ? 5 : 15}
                      </div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            t.status === "Active"
                              ? "#ecfdf5"
                              : t.status === "Trial"
                                ? "#fffbeb"
                                : "#fef2f2",
                          color:
                            t.status === "Active"
                              ? "#059669"
                              : t.status === "Trial"
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              localStorage.setItem("scalezix_impersonating_tenant", JSON.stringify(t));
                            }
                            notify(`Switched context to ${t.name}'s workspace`);
                            window.location.href = "/dashboard#overview";
                          }}
                        >
                          <Eye size={12} style={{ marginRight: 4 }} />
                          Enter Workspace
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "4px 8px", fontSize: 12, color: t.status === "Active" ? "#dc2626" : "#059669" }}
                          onClick={() => handleToggleStatus(t.id)}
                        >
                          {t.status === "Active" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Wholesale vs Retail Profit Margin Matrix */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <strong style={{ fontSize: 15, color: "#0f172a" }}>Your SaaS Margin & Credit Pricing Matrix</strong>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                  How you generate profit on every call, WhatsApp message, and email sent by your client companies.
                </p>
              </div>
              <Badge>54% Average Gross Margin</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 6 }}>
                  <MessageCircle size={14} /> WhatsApp Message
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>₹1.00 / msg</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Wholesale: ₹0.55 · <strong>45% Profit</strong>
                </div>
              </div>

              <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", display: "flex", alignItems: "center", gap: 6 }}>
                  <PhoneCall size={14} /> AI Calling Minute
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>₹2.50 / min</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Wholesale: ₹0.90 · <strong>64% Profit</strong>
                </div>
              </div>

              <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: 6 }}>
                  <Mail size={14} /> Cold Email
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>₹0.10 / email</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Wholesale: ₹0.02 · <strong>80% Profit</strong>
                </div>
              </div>

              <div style={{ background: "#fff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706", display: "flex", alignItems: "center", gap: 6 }}>
                  <Award size={14} /> Blue Tick Service
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>₹19,999 / brand</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Assisted OBA submission fee
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: SAAS FINANCIALS & MARGINS */}
      {activeTab === "financials" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* MRR Breakdown Card */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 22 }}>
            <strong style={{ fontSize: 16, color: "#0f172a", display: "block", marginBottom: 6 }}>Monthly Recurring Revenue by Tier</strong>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>Subscription income from onboarded businesses.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
                <div>
                  <strong style={{ color: "#0f172a", fontSize: 14 }}>Starter Tier (₹1,999/mo)</strong>
                  <div style={{ fontSize: 11, color: "#64748b" }}>1 business subscribed</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>₹1,999/mo</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
                <div>
                  <strong style={{ color: "#0f172a", fontSize: 14 }}>Growth Tier (₹4,999/mo)</strong>
                  <div style={{ fontSize: 11, color: "#64748b" }}>2 businesses subscribed</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>₹9,998/mo</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
                <div>
                  <strong style={{ color: "#0f172a", fontSize: 14 }}>Enterprise Tier (₹14,999/mo)</strong>
                  <div style={{ fontSize: 11, color: "#64748b" }}>1 business subscribed</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>₹14,999/mo</div>
              </div>

              <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 15, color: "#0f172a" }}>Total Platform MRR</strong>
                <strong style={{ fontSize: 20, color: "#059669" }}>₹{totalMrrRupees.toLocaleString("en-IN")}/mo</strong>
              </div>
            </div>
          </div>

          {/* Wholesale Margin Matrix Card */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: "#0f172a" }}>Usage Markup & Gross Profit Matrix</strong>
              <Badge>54% Average Margin</Badge>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>Your profit earned on every unit sent by clients.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>WhatsApp Message</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>₹1.00</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Wholesale: ₹0.55 · <strong>45% Profit</strong></div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>AI Voice Calling</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>₹2.50/min</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Wholesale: ₹0.90 · <strong>64% Profit</strong></div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>Cold Email</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>₹0.10</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Wholesale: ₹0.02 · <strong>80% Profit</strong></div>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>WhatsApp Blue Tick</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>₹19,999</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Assisted OBA submission fee</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OMNICHANNEL GATEWAY INFRASTRUCTURE */}
      {activeTab === "gateways" && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <strong style={{ fontSize: 16, color: "#0f172a" }}>Omnichannel Provider Gateway Status</strong>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Live connectivity, rate limits, and latency across all core telecommunications APIs.</p>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => notify("Pinging provider gateways... All 5 gateways responded healthy!")}
            >
              <RefreshCw size={13} style={{ marginRight: 6 }} />
              Run Gateway Health Ping
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>Meta Cloud API</strong>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              </div>
              <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 4 }}>WhatsApp Business</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#334155" }}>
                <div>Latency: <strong>142ms</strong></div>
                <div>Rate Limit: <strong>18 / 80 req/s</strong></div>
                <div>Queue: <strong>0 pending</strong></div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>Plivo SIP Trunk</strong>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              </div>
              <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, marginTop: 4 }}>Telephony Voice</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#334155" }}>
                <div>SIP Ping: <strong>68ms</strong></div>
                <div>Channels: <strong>2 active</strong></div>
                <div>Loss: <strong>0.01%</strong></div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>Cartesia Sonic</strong>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              </div>
              <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginTop: 4 }}>Voice Synthesis TTS</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#334155" }}>
                <div>TTFB: <strong>89ms</strong></div>
                <div>Models: <strong>sonic-en/hi</strong></div>
                <div>Uptime: <strong>99.98%</strong></div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>Sarvam AI</strong>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              </div>
              <div style={{ fontSize: 11, color: "#ea580c", fontWeight: 600, marginTop: 4 }}>Indic Speech ASR</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#334155" }}>
                <div>Latency: <strong>110ms</strong></div>
                <div>Model: <strong>saaras:v1</strong></div>
                <div>Accuracy: <strong>96.4%</strong></div>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>Resend / SMTP</strong>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              </div>
              <div style={{ fontSize: 11, color: "#0284c7", fontWeight: 600, marginTop: 4 }}>Cold Email Relays</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#334155" }}>
                <div>Latency: <strong>44ms</strong></div>
                <div>Placement: <strong>98.6%</strong></div>
                <div>IP Rep: <strong>99/100</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL & LOGS */}
      {activeTab === "audit" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 18, marginBottom: 28 }}>
          <strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginBottom: 12 }}>Platform Security & Impersonation Audit Log</strong>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: 12, color: "#64748b" }}>
                <th style={{ padding: "10px 12px" }}>Timestamp</th>
                <th style={{ padding: "10px 12px" }}>Event Type</th>
                <th style={{ padding: "10px 12px" }}>Operator</th>
                <th style={{ padding: "10px 12px" }}>Target Workspace</th>
                <th style={{ padding: "10px 12px" }}>Details</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>Today 09:48</td>
                <td style={{ padding: "10px 12px" }}><Badge>Impersonation</Badge></td>
                <td style={{ padding: "10px 12px" }}>Utkarsh Makwana</td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>UrbanKicks E-Commerce</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>Switched into client workspace in view-as mode</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>Today 09:42</td>
                <td style={{ padding: "10px 12px" }}><Badge>Security Audit</Badge></td>
                <td style={{ padding: "10px 12px" }}>System Security</td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Global Platform</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>Super admin controls quarantined to /admin route</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>Yesterday 16:30</td>
                <td style={{ padding: "10px 12px" }}><Badge>Provisioning</Badge></td>
                <td style={{ padding: "10px 12px" }}>Utkarsh Makwana</td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>PrimeRealty Ventures</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>Provisioned Growth plan with 4,100 credits</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Provision New Client Company Modal */}
      {newTenantModalOpen && (
        <Modal
          title="Provision New Client Business (SaaS Workspace)"
          close={() => setNewTenantModalOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateTenant();
            }}
          >
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Creates an isolated workspace for a new startup, agency, or MSME with their own private database, campaigns, and credits.
            </p>

            <div className="console-form-grid" style={{ marginBottom: 16 }}>
              <label>
                Company / Startup Name
                <input
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Apex Logistics Pvt Ltd"
                />
              </label>

              <label>
                Business Category
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  <option>D2C & Retail</option>
                  <option>Fintech & Loans</option>
                  <option>EdTech & Courses</option>
                  <option>Real Estate Brokerage</option>
                  <option>Healthcare & Clinics</option>
                  <option>B2B SaaS & Tech</option>
                  <option>Marketing Agency</option>
                </select>
              </label>

              <label>
                Founder / Contact Name
                <input
                  required
                  value={newFounderName}
                  onChange={(e) => setNewFounderName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                />
              </label>

              <label>
                Founder Email (Sign-in Email)
                <input
                  type="email"
                  required
                  value={newFounderEmail}
                  onChange={(e) => setNewFounderEmail(e.target.value)}
                  placeholder="rajesh@apexlogistics.in"
                />
              </label>

              <label>
                Subscription Plan Tier
                <select value={newPlan} onChange={(e) => setNewPlan(e.target.value as typeof newPlan)}>
                  <option value="Starter">Starter — ₹1,999/mo (WhatsApp + Email)</option>
                  <option value="Growth">Growth — ₹4,999/mo (WhatsApp + Voice + Email)</option>
                  <option value="Enterprise">Enterprise — ₹14,999/mo (All channels + Blue Tick)</option>
                </select>
              </label>

              <label>
                Initial Trial Credits
                <input
                  type="number"
                  min={100}
                  value={initialCredits}
                  onChange={(e) => setInitialCredits(Number(e.target.value))}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setNewTenantModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                style={{ background: "#4f46e5" }}
              >
                Provision Workspace & Send Invite
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Top-up Credits Modal */}
      {topUpModalTenant && (
        <Modal
          title={`Top Up Credits for ${topUpModalTenant.name}`}
          close={() => setTopUpModalTenant(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTopUpCredits();
            }}
          >
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              Current balance: <strong>{topUpModalTenant.creditsBalance.toLocaleString()} credits</strong>.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Number of Credits to Add
              </label>
              <input
                type="number"
                min={100}
                step={500}
                value={topUpCredits}
                onChange={(e) => setTopUpCredits(Number(e.target.value))}
                style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setTopUpModalTenant(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                style={{ background: "#059669" }}
              >
                Add Credits to Tenant
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
