"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Phone,
  MessageCircle,
  Mail,
  Sparkles,
  BarChart3,
  GitBranch,
  CalendarDays,
  Link2,
  Wallet,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
  Bell,
  Plus,
  Search,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Key,
  CheckCircle,
  FileText,
  User,
  LogOut,
  IndianRupee,
  CreditCard,
  Building2,
  Bot,
} from "lucide-react";
import RapidSalesLogo from "./rapid-logo";
import RapidMascot from "./rapid-mascot";
import SetupGuide from "./setup-guide";
import CommandPalette from "./command-palette";
import CreditModal from "./credit-modal";
import AiUsageModal from "./ai-usage-modal";
import { LocalProvider, useWorkspace } from "../local-provider";
import { balance, channels, type Channel } from "@/lib/local-workspace";
import Contacts from "./contacts";
import Overview from "./overview";
import VoiceDashboard from "./voice-dashboard";
import WhatsAppDashboard from "./whatsapp-dashboard";
import EmailDashboard from "./email-dashboard";
import Campaigns from "./campaigns";
import Templates from "./templates";
import Inbox from "./inbox";
import Sequences from "./sequences";
import Voice from "./voice";
import IvrBuilder from "./ivr-builder";
import Resources from "./resources";
import Links from "./links";
import Bots from "./bots";
import Tasks from "./tasks";
import Reports from "./reports";
import Settings from "./settings";
import WhatsAppBlueTick from "./whatsapp-blue-tick";
import WhatsAppConfig from "./whatsapp-config";
import MailConfig from "./mail-config";
import Profile from "./profile";
import OnboardingWizard from "./onboarding-wizard";
import { Panel, Empty, Badge, date } from "./ui";
import { groups, names } from "./navigation";
import Operations from "./operations";
import ProviderInbox from "./provider-inbox";
import IntegrationReadiness from "./integration-readiness";
import ConnectedVoice from "./connected-voice";
import { AccountProvider } from "../local-provider";
import type { AccountIdentity } from "@/lib/workspace-document";
import { createBrowserClient } from "@supabase/ssr";

export default function Console({ account }: { account?: AccountIdentity }) {
  return account ? (
    <AccountProvider key={account.workspaceId} account={account}>
      <WorkspaceConsole account={account} />
    </AccountProvider>
  ) : (
    <LocalProvider>
      <WorkspaceConsole />
    </LocalProvider>
  );
}

function WorkspaceConsole({ account }: { account?: AccountIdentity }) {
  const {
    state: s,
    ready,
    error,
    update,
    saveStatus,
    canEdit,
  } = useWorkspace();
  const [page, setPage] = useState("overview"),
    [expanded, setExpanded] = useState<string[]>([]),
    [mobile, setMobile] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [toast, setToast] = useState(""),
    [notifications, setNotifications] = useState(false),
    [setupGuideOpen, setSetupGuideOpen] = useState(false),
    [onboardingOpen, setOnboardingOpen] = useState(false),
    [paletteOpen, setPaletteOpen] = useState(false),
    [rechargeOpen, setRechargeOpen] = useState(false),
    [aiLimitsOpen, setAiLimitsOpen] = useState(false),
    [profileMenuOpen, setProfileMenuOpen] = useState(false),
    [impersonatedTenant, setImpersonatedTenant] = useState<string | null>(null);

  const userName = account ? (account.email.split("@")[0] || "User") : "Utkarsh Makwana";
  const userEmail = account ? account.email : "um18218@gmail.com";
  const isSuperAdmin = !account || userEmail.toLowerCase() === "um18218@gmail.com" || account?.role === "superadmin";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("leadpilot_impersonating_tenant");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.name) setImpersonatedTenant(parsed.name);
      }
    } catch {}
  }, []);

  const getParentRapidGroup = (id: string) => {
    if (["contacts", "segments", "contact-filters"].includes(id)) return "Contacts";
    if (["campaigns", "audience-review", "sequences"].includes(id)) return "Campaigns";
    if (["voice-overview", "call-center", "call-logs", "transfers", "bookings", "agents", "voice-connected", "ivr"].includes(id)) return "AI Calling";
    if (["wa-overview", "wa-inbox", "wa-templates", "wa-broadcast"].includes(id)) return "WhatsApp";
    if (["email-overview", "email-inbox", "email-templates"].includes(id)) return "Email";
    if (["email-setup", "wa-onboarding", "windows"].includes(id)) return "Configuration";
    return null;
  };

  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1);
      if (id === "saas-admin") {
        if (isSuperAdmin) {
          window.location.href = "/admin";
        } else {
          window.location.hash = "overview";
        }
        return;
      }
      if (id && (names[id] || id === "overview")) {
        setPage(id);
        const groupName = getParentRapidGroup(id);
        if (groupName) setExpanded([groupName]);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [isSuperAdmin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  const navigate = (id: string) => {
    setPage(id);
    window.history.replaceState(null, "", `#${id}`);
    const groupName = getParentRapidGroup(id);
    if (groupName) setExpanded([groupName]);
    setMobile(false);
    setNotifications(false);
    setProfileMenuOpen(false);
  };

  const notify = (text: string) => setToast(text);

  const channelOverview = (channel: Channel) => {
    const campaigns = s.campaigns.filter((c) => c.channel === channel),
      messages = s.messages.filter((m) => m.channel === channel);
    return (
      <>
        <Panel
          title={`${channel} overview`}
          description="Local workspace activity · Multi-channel outreach hub."
          action={<Badge>Connected</Badge>}
        >
          <div className="console-status-grid">
            <div>
              <strong>{campaigns.length}</strong>
              <small>Campaigns</small>
            </div>
            <div>
              <strong>
                {channel === "AI calling"
                  ? s.calls.length
                  : messages.filter(
                      (m) =>
                        m.kind === "Simulation" && m.direction === "outbound",
                    ).length}
              </strong>
              <small>
                {channel === "AI calling"
                  ? "Calls executed"
                  : "Messages delivered"}
              </small>
            </div>
            <div>
              <strong>
                {
                  s.contacts.filter(
                    (c) =>
                      c.consent &&
                      !c.optedOut &&
                      (channel === "Email" ? c.email : c.phone),
                  ).length
                }
              </strong>
              <small>Subscribed audience</small>
            </div>
            <div>
              <strong>99.8%</strong>
              <small>Delivery success</small>
            </div>
          </div>
          <div className="console-actions">
            {channel === "WhatsApp" ? (
              <>
                <button
                  className="primary"
                  onClick={() => navigate("wa-broadcast")}
                >
                  Plan a broadcast
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("wa-inbox")}
                >
                  Open inbox
                </button>
                <button className="secondary" onClick={() => navigate("bots")}>
                  Build chatbot flow
                </button>
              </>
            ) : channel === "Email" ? (
              <>
                <button
                  className="primary"
                  onClick={() => navigate("campaigns")}
                >
                  Create email campaign
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("email-inbox")}
                >
                  Open inbox
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("senders")}
                >
                  Configure sender
                </button>
              </>
            ) : (
              <>
                <button className="primary" onClick={() => navigate("agents")}>
                  Build voice agent
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("call-center")}
                >
                  Preview call
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("call-logs")}
                >
                  Review logs
                </button>
              </>
            )}
          </div>
        </Panel>
        <Panel title="Connection health">
          <div className="console-status-grid">
            {(channel === "WhatsApp"
              ? [
                  "API status: Online",
                  "Quality rating: High (Green)",
                  "Messaging limit: 10k/day",
                  "Display name: Verified",
                ]
              : channel === "Email"
                ? [
                  "Mailbox authorization: Active",
                  "Sender identity: Verified",
                  "Reply synchronization: Live",
                  "DNS (SPF/DKIM): Valid",
                ]
                : [
                  "Telephony: Plivo Connected",
                  "Speech: Cartesia Sonic 8kHz",
                  "Call recording: Encrypted",
                  "Calendar sync: Connected",
                ]
            ).map((label) => (
              <div key={label}>
                <strong>Active</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </Panel>
      </>
    );
  };

  let content;
  if (page === "overview")
    content = (
      <Overview
        navigate={navigate}
        onOpenRecharge={() => setRechargeOpen(true)}
      />
    );
  else if (
    ["contacts", "segments", "qualified", "contact-filters"].includes(page)
  )
    content = (
      <Contacts
        qualified={page === "qualified"}
        advanced={page === "contact-filters"}
        segments={page === "segments"}
        notify={notify}
      />
    );
  else if (
    [
      "campaigns",
      "wa-broadcast",
      "audience-review",
      "campaign-schedule",
    ].includes(page)
  )
    content = (
      <Campaigns
        key={page}
        initialStatus={page === "campaign-schedule" ? "Scheduled" : ""}
        channel={page === "wa-broadcast" ? "WhatsApp" : undefined}
        view={page === "audience-review" ? "leads" : "campaigns"}
        notify={notify}
        navigate={navigate}
      />
    );
  else if (page === "sequences") content = <Sequences notify={notify} />;
  else if (page === "wa-templates" || page === "email-templates")
    content = (
      <Templates
        channel={page === "wa-templates" ? "WhatsApp" : "Email"}
        notify={notify}
      />
    );
  else if (page === "wa-inbox" || page === "email-inbox")
    content = (
      <Inbox
        account={account}
        channel={page === "wa-inbox" ? "WhatsApp" : "Email"}
        notify={notify}
      />
    );
  else if (page === "voice-overview")
    content = <VoiceDashboard navigate={navigate} />;
  else if (page === "wa-overview")
    content = <WhatsAppDashboard navigate={navigate} />;
  else if (page === "email-overview")
    content = <EmailDashboard navigate={navigate} />;
  else if (
    page === "voice-connected" ||
    page === "transfers"
  )
    content = (
      <ConnectedVoice
        key={account?.workspaceId}
        account={account}
        view={page === "transfers" ? "transfers" : "setup"}
      />
    );
  else if (["agents", "call-center", "call-logs"].includes(page))
    content = (
      <Voice
        view={
          page === "agents"
            ? "Agent Builder"
            : page === "call-center"
              ? "Call Center"
              : "Call Logs"
        }
        notify={notify}
      />
    );
  else if (page === "ivr") content = <IvrBuilder notify={notify} />;
  else if (["links", "qr", "widget"].includes(page))
    content = <Links key={page} mode={page} notify={notify} />;
  else if (page === "bots") content = <Bots notify={notify} />;
  else if (page === "analytics" || page === "automation")
    content = <Reports automation={page === "automation"} />;
  else if (["settings", "windows", "billing", "team"].includes(page))
    content = (
      <Settings
        view={
          page === "windows"
            ? "Working days"
            : page === "billing"
              ? "Billing"
              : page === "team"
                ? "Team"
                : "Settings"
        }
        notify={notify}
      />
    );
  else if (page === "verification")
    content = (
      <WhatsAppBlueTick
        account={account}
        notify={notify}
        navigate={navigate}
      />
    );
  else if (page === "wa-onboarding")
    content = (
      <WhatsAppConfig
        account={account}
        notify={notify}
        navigate={navigate}
      />
    );
  else if (page === "email-setup" || page === "identities" || page === "senders")
    content = <MailConfig account={account} notify={notify} />;
  else if (page === "edit-profile" || page === "profile")
    content = (
      <Profile
        userName={userName}
        userEmail={userEmail}
        notify={notify}
        onNavigate={navigate}
      />
    );
  else if (page === "tasks") content = <Tasks notify={notify} />;
  else if (
    [
      "wa-health",
      "inbox-overview",
      "handoffs",
      "automation-handoffs",
      "sheets",
      "webhooks",
      "email-sync",
      "availability",
      "reminders",
      "channel-costs",
      "delivery",
      "orders",
      "invoices",
      "rates",
      "campaign-history",
      "activity",
    ].includes(page)
  )
    content = (
      <Operations
        key={page}
        page={page}
        navigate={navigate}
        notify={notify}
        account={account}
      />
    );
  else if (page === "wa-provider-inbox")
    content = <ProviderInbox account={account} />;
  else if (page === "integrations")
    content = <IntegrationReadiness account={account} navigate={navigate} />;
  else {
    const kind = (
      {
        sources: "lead-source",
        "chat-agents": "chat-agent",
        forms: "form",
        catalog: "product",
        transfers: "transfer",
        ivr: "ivr",
        bookings: "booking",
        senders: "sender",
        identities: "identity",
      } as const
    )[page as "sources"];
    content = kind ? (
      <Resources key={kind} kind={kind} notify={notify} />
    ) : (
      <Empty>Select a module from the sidebar.</Empty>
    );
  }

  type RapidSubitem = { id: string; title: string };
  type RapidSubsection = { header?: string; items: RapidSubitem[] };
  type RapidGroup = {
    name: string;
    icon: typeof Users;
    defaultPage: string;
    subsections: RapidSubsection[];
  };

  const audienceGroups: RapidGroup[] = [
    {
      name: "Contacts",
      icon: Users,
      defaultPage: "contacts",
      subsections: [
        {
          items: [
            { id: "contacts", title: "All Contacts" },
            { id: "segments", title: "Segments" },
          ],
        },
      ],
    },
    {
      name: "Campaigns",
      icon: Megaphone,
      defaultPage: "campaigns",
      subsections: [
        {
          items: [
            { id: "campaigns", title: "All Campaigns" },
            { id: "audience-review", title: "Leads" },
            { id: "email-templates", title: "Templates" },
            { id: "sequences", title: "Sequences" },
          ],
        },
      ],
    },
  ];

  const channelGroups: RapidGroup[] = [
    {
      name: "AI Calling",
      icon: Phone,
      defaultPage: "voice-overview",
      subsections: [
        {
          header: "DAILY",
          items: [
            { id: "voice-overview", title: "Dashboard" },
            { id: "call-center", title: "Call Center" },
            { id: "call-logs", title: "Call Logs" },
            { id: "transfers", title: "Transfer Requests" },
            { id: "bookings", title: "Bookings" },
          ],
        },
        {
          header: "SETUP",
          items: [
            { id: "agents", title: "Agent Builder" },
            { id: "voice-connected", title: "Inbound Numbers" },
            { id: "ivr", title: "IVR Menus" },
          ],
        },
      ],
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      defaultPage: "wa-overview",
      subsections: [
        {
          items: [
            { id: "wa-overview", title: "Dashboard" },
            { id: "wa-inbox", title: "Inbox" },
            { id: "wa-templates", title: "Templates" },
            { id: "wa-broadcast", title: "Broadcast" },
          ],
        },
      ],
    },
    {
      name: "Email",
      icon: Mail,
      defaultPage: "email-overview",
      subsections: [
        {
          items: [
            { id: "email-overview", title: "Dashboard" },
            { id: "email-inbox", title: "Inbox" },
            { id: "email-templates", title: "Templates" },
          ],
        },
      ],
    },
  ];

  const setupConfigGroup: RapidGroup = {
    name: "Configuration",
    icon: SettingsIcon,
    defaultPage: "email-setup",
    subsections: [
      {
        items: [
          { id: "email-setup", title: "Mail Config" },
          { id: "wa-onboarding", title: "WhatsApp Config" },
          { id: "voice-connected", title: "AI Call Config" },
          { id: "windows", title: "Working Days" },
        ],
      },
    ],
  };

  const allRapidGroups = [...audienceGroups, ...channelGroups, setupConfigGroup];

  const renderRapidGroup = (group: RapidGroup) => {
    const isExpanded = expanded.includes(group.name);
    const allItemIds = group.subsections.flatMap((s) => s.items.map((i) => i.id));
    const hasActiveChild = allItemIds.includes(page);

    return (
      <div className="console-nav-group" key={group.name}>
        <button
          type="button"
          className={`console-nav-item ${hasActiveChild ? "group-selected" : ""}`}
          aria-expanded={isExpanded}
          aria-controls={`group-${group.name.replaceAll(" ", "-")}`}
          onClick={() => {
            if (sidebarCollapsed) setSidebarCollapsed(false);
            if (!isExpanded) {
              setExpanded([group.name]);
              if (!allItemIds.includes(page)) {
                setPage(group.defaultPage);
                window.history.replaceState(null, "", `#${group.defaultPage}`);
              }
            } else {
              setExpanded([]);
            }
          }}
          title={group.name}
        >
          <group.icon size={18} />
          {!sidebarCollapsed && <span>{group.name}</span>}
          {!sidebarCollapsed && (
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          )}
        </button>
        {isExpanded && !sidebarCollapsed && (
          <div
            className="console-subnav"
            id={`group-${group.name.replaceAll(" ", "-")}`}
          >
            {group.subsections.map((sub, sIdx) => (
              <div key={sIdx} className="space-y-0.5">
                {sub.header && (
                  <div className="console-subnav-section-title">
                    {sub.header}
                  </div>
                )}
                {sub.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={page === item.id ? "page" : undefined}
                    className={page === item.id ? "active" : ""}
                    onClick={() => navigate(item.id)}
                  >
                    <i />
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const userInitials = "UM";
  const walletBal = balance(s);

  return (
    <div className={`outreach-console ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {mobile && (
        <button
          className="console-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Rapid Sales Sleek Dark Sidebar */}
      <aside className={`console-sidebar ${mobile ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        {/* Brand Header */}
        <div className="rapid-sidebar-header">
          <a className="rapid-sidebar-brand-link" href="/dashboard" onClick={(e) => { e.preventDefault(); navigate("overview"); }}>
            <RapidSalesLogo collapsed={sidebarCollapsed} size={28} />
          </a>
          <button
            type="button"
            className="rapid-sidebar-toggle-btn"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar width"
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Find a page... Ctrl K Search input button */}
        {!sidebarCollapsed ? (
          <div
            className="rapid-sidebar-search"
            onClick={() => setPaletteOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="Find a page or action"
          >
            <Search size={15} className="rapid-search-icon" />
            <span className="rapid-search-text">Find a page...</span>
            <kbd className="rapid-search-kbd">Ctrl K</kbd>
          </div>
        ) : (
          <button
            type="button"
            className="rapid-sidebar-search-icon-only"
            title="Search (Ctrl+K)"
            onClick={() => setPaletteOpen(true)}
          >
            <Search size={17} />
          </button>
        )}

        {/* Navigation list */}
        <nav className="rapid-sidebar-nav" aria-label="Workspace navigation">
          {/* Active Dashboard Button */}
          <button
            className={`console-nav-item rapid-dashboard-nav-item ${page === "overview" ? "active" : ""}`}
            aria-current={page === "overview" ? "page" : undefined}
            onClick={() => navigate("overview")}
            title="Dashboard"
          >
            <LayoutDashboard size={18} className="rapid-dashboard-nav-icon" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          {/* Section: AUDIENCE */}
          <div className="console-nav-label">AUDIENCE</div>
          {audienceGroups.map(renderRapidGroup)}

          {/* Section: CHANNELS */}
          <div className="console-nav-label">CHANNELS</div>
          {channelGroups.map(renderRapidGroup)}

          {/* Section: LEADS */}
          <div className="console-nav-label">LEADS</div>
          <button
            type="button"
            className={`console-nav-item ${page === "qualified" ? "active" : ""}`}
            onClick={() => navigate("qualified")}
            title="Qualified Leads"
          >
            <CheckCircle size={18} />
            {!sidebarCollapsed && <span>Qualified Leads</span>}
          </button>

          {/* Section: REPORTS */}
          <div className="console-nav-label">REPORTS</div>
          <button
            type="button"
            className={`console-nav-item ${page === "automation" ? "active" : ""}`}
            onClick={() => navigate("automation")}
            title="Automation Reports"
          >
            <FileText size={18} />
            {!sidebarCollapsed && <span>Automation Reports</span>}
          </button>
          <button
            type="button"
            className={`console-nav-item ${page === "analytics" ? "active" : ""}`}
            onClick={() => navigate("analytics")}
            title="Analytics"
          >
            <BarChart3 size={18} />
            {!sidebarCollapsed && <span>Analytics</span>}
          </button>

          {/* Section: SETUP */}
          <div className="console-nav-label">SETUP</div>
          {renderRapidGroup(setupConfigGroup)}
          <button
            type="button"
            className={`console-nav-item ${page === "integrations" ? "active" : ""}`}
            onClick={() => navigate("integrations")}
            title="API Keys"
          >
            <Key size={18} />
            {!sidebarCollapsed && <span>API Keys</span>}
          </button>
          <button
            type="button"
            className={`console-nav-item ${page === "billing" ? "active" : ""}`}
            onClick={() => navigate("billing")}
            title="Billing"
          >
            <CreditCard size={18} />
            {!sidebarCollapsed && <span>Billing</span>}
          </button>
        </nav>

        {/* User Account Card at Bottom of Sidebar */}
        <div
          className={`rapid-user-card ${page === "edit-profile" ? "active" : ""}`}
          onClick={() => navigate("edit-profile")}
          role="button"
          tabIndex={0}
          title="Edit profile"
        >
          <div className="rapid-user-avatar">
            <span>{userInitials}</span>
          </div>
          {!sidebarCollapsed && (
            <div className="rapid-user-details">
              <strong className="rapid-user-name">{userName}</strong>
              <small className="rapid-user-email">{userEmail}</small>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="console-main">
        {/* Super Admin Tenant Impersonation Banner */}
        {impersonatedTenant && (
          <div
            style={{
              background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
              color: "#e0e7ff",
              padding: "10px 20px",
              fontSize: 13,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
              zIndex: 30,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                SUPER ADMIN VIEW
              </span>
              <span>
                Viewing isolated client workspace: <strong>{impersonatedTenant}</strong>
              </span>
            </div>
            <button
              type="button"
              style={{
                background: "#e0e7ff",
                color: "#1e1b4b",
                border: "none",
                borderRadius: 5,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => {
                localStorage.removeItem("leadpilot_impersonating_tenant");
                setImpersonatedTenant(null);
                window.location.href = "/admin";
              }}
            >
              ← Return to Super Admin Portal
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="console-topbar rapid-topbar">
          <div className="console-breadcrumb">
            <button
              className="icon-button console-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <div className="rapid-topbar-breadcrumb">
              <span>{(!s.settings?.name || s.settings.name === "Rapid Sales" || s.settings.name === "Sprint" || s.settings.name === "Scalezix workspace") ? "Leadpilot" : s.settings.name}</span>
              <span>/</span>
              <strong>{names[page] || "Dashboard"}</strong>
            </div>
          </div>

          <div className="console-actions rapid-topbar-actions">
            {/* Credits Pill (Greenish) */}
            <button
              type="button"
              className="rapid-credits-pill"
              onClick={() => setRechargeOpen(true)}
              title="Add wallet credits"
            >
              <div className="rapid-credits-icon">
                <Wallet size={14} />
              </div>
              <div className="rapid-credits-text">
                <span className="rapid-credits-label">CREDITS</span>
                <strong className="rapid-credits-val">
                  {walletBal.toLocaleString()}
                </strong>
              </div>
              <span className="rapid-credits-plus" title="Add credits">
                <Plus size={12} />
              </span>
            </button>

            {/* AI Usage Limits Pill (Purple) */}
            <button
              type="button"
              className="rapid-ai-usage-pill"
              onClick={() => setAiLimitsOpen(true)}
              title="View AI Usage & Channel Limits"
            >
              <Sparkles size={14} className="text-purple-600" />
              <div className="rapid-ai-usage-text">
                <span className="rapid-ai-usage-label">AI USAGE</span>
                <strong className="rapid-ai-usage-val">Limits</strong>
              </div>
            </button>

            {/* Notification Bell */}
            <button
              className="icon-button rapid-bell-btn"
              aria-label="Notifications"
              aria-expanded={notifications}
              onClick={() => setNotifications((v) => !v)}
              title="Notifications"
            >
              <Bell size={18} />
              {s.tasks.some((t) => !t.done) && (
                <span className="rapid-bell-indicator" />
              )}
            </button>

            {/* User Profile Pill Dropdown */}
            <div className="relative">
              <button
                type="button"
                className="rapid-profile-btn"
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-expanded={profileMenuOpen}
              >
                <div className="rapid-profile-avatar-small">
                  <span>{userInitials}</span>
                </div>
                <span className="rapid-profile-name">{userName}</span>
                <ChevronDown size={14} className={`rapid-profile-chevron ${profileMenuOpen ? "rotated" : ""}`} />
              </button>

              {profileMenuOpen && (
                <div className="rapid-profile-dropdown" role="menu">
                  <div className="rapid-profile-dropdown-header">
                    <strong>{userName}</strong>
                    <small>{userEmail}</small>
                  </div>
                  <div className="rapid-profile-dropdown-divider" />
                  {isSuperAdmin && (
                    <>
                      <a
                        href="/admin"
                        className="rapid-dropdown-item"
                        role="menuitem"
                        style={{ color: "#4f46e5", fontWeight: 600 }}
                      >
                        <ShieldCheck size={15} />
                        <span>Super Admin Portal</span>
                      </a>
                      <div className="rapid-profile-dropdown-divider" />
                    </>
                  )}
                  <button
                    type="button"
                    className="rapid-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("edit-profile");
                    }}
                  >
                    <User size={15} />
                    <span>Edit Profile</span>
                  </button>
                  <a
                    href={account ? "/account/manage" : "/login"}
                    className="rapid-dropdown-item"
                    role="menuitem"
                  >
                    <SettingsIcon size={15} />
                    <span>Account Security</span>
                  </a>
                  <button
                    type="button"
                    className="rapid-dropdown-item"
                    role="menuitem"
                    style={{ color: "#0284c7", fontWeight: 600 }}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setOnboardingOpen(true);
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Industry Setup Wizard</span>
                  </button>
                  <button
                    type="button"
                    className="rapid-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("settings");
                    }}
                  >
                    <SettingsIcon size={15} />
                    <span>Workspace Settings</span>
                  </button>
                  <button
                    type="button"
                    className="rapid-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setRechargeOpen(true);
                    }}
                  >
                    <Wallet size={15} />
                    <span>Recharge Credits</span>
                  </button>
                  <div className="rapid-profile-dropdown-divider" />
                  {account ? (
                    <button
                      type="button"
                      className="rapid-dropdown-item danger"
                      role="menuitem"
                      onClick={async () => {
                        const client = createBrowserClient(
                          process.env.NEXT_PUBLIC_SUPABASE_URL!,
                          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                        );
                        await client.auth.signOut();
                        location.href = "/login";
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign out</span>
                    </button>
                  ) : (
                    <a href="/login" className="rapid-dropdown-item">
                      <LogOut size={15} />
                      <span>Sign in to save</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Notifications Popover */}
        {notifications && (
          <aside className="console-notifications">
            <header className="flex justify-between items-center mb-3">
              <h3>Notifications</h3>
              <button
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setNotifications(false)}
              >
                Close
              </button>
            </header>
            <p>
              Wallet balance: ₹{walletBal.toLocaleString()} credits available.
            </p>
            <p>
              {s.tasks.filter((t) => !t.done).length} active follow-up tasks in workspace.
            </p>
            <p className="text-emerald-600 font-medium text-xs mt-2">
              ● All outreach channels operating normally.
            </p>
          </aside>
        )}

        {/* Workspace Content */}
        <div className="console-content">
          {error && (
            <div className="console-error" role="alert">
              {error}
              <button
                className="secondary"
                onClick={() => navigate("settings")}
              >
                Open data recovery
              </button>
            </div>
          )}

          {!ready ? (
            <Empty>Loading your Leadpilot workspace…</Empty>
          ) : (
            <div key={page}>
              {page !== "overview" && (
                <div className="console-page-title">
                  <span className="console-overline">
                    LEADPILOT OUTREACH
                  </span>
                  <h1>{names[page]}</h1>
                </div>
              )}
              {content}
            </div>
          )}
        </div>

        <footer className="console-footer">
          Leadpilot Automation Platform · <span>AI Calling · WhatsApp · Cold Email</span>
        </footer>
      </main>

      {/* Floating Mascot (Blue cute robot) */}
      <RapidMascot
        onNavigate={navigate}
        onOpenSetup={() => setSetupGuideOpen(true)}
      />

      {/* Floating "✨ Setup Guide" Button */}
      <button
        type="button"
        className="rapid-floating-setup-btn"
        onClick={() => setSetupGuideOpen(true)}
        title="Open Onboarding Setup Guide"
      >
        <Sparkles size={16} />
        <span>Setup Guide</span>
      </button>

      {/* Setup Guide Drawer */}
      <SetupGuide
        isOpen={setupGuideOpen}
        onClose={() => setSetupGuideOpen(false)}
        onNavigate={navigate}
        onOpenWizard={() => setOnboardingOpen(true)}
      />

      {/* Industry Setup Wizard Modal */}
      <OnboardingWizard
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        notify={notify}
        onNavigate={navigate}
      />

      {/* Quick Search Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
      />

      {/* Recharge Credits Modal */}
      <CreditModal
        isOpen={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        notify={notify}
      />

      {/* AI Usage & Limits Modal */}
      <AiUsageModal
        isOpen={aiLimitsOpen}
        onClose={() => setAiLimitsOpen(false)}
        onNavigate={navigate}
      />

      {/* Toast notifications */}
      {toast && (
        <div className="console-toast" role="status">
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
