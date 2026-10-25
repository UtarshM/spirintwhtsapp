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
  Menu,
  X,
  ArrowUpRight,
  Bell,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import SalesMark from "../sales-mark";
import { LocalProvider, useWorkspace } from "../local-provider";
import { balance, channels, type Channel } from "@/lib/local-workspace";
import Contacts from "./contacts";
import Campaigns from "./campaigns";
import Templates from "./templates";
import Inbox from "./inbox";
import Sequences from "./sequences";
import Voice from "./voice";
import Resources from "./resources";
import Links from "./links";
import Bots from "./bots";
import Tasks from "./tasks";
import Reports from "./reports";
import Settings from "./settings";
import { Panel, Empty, Badge, date } from "./ui";
import { groups, names } from "./navigation";
import Operations from "./operations";
import ProviderInbox from "./provider-inbox";
import IntegrationReadiness from "./integration-readiness";
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
    [toast, setToast] = useState(""),
    [notifications, setNotifications] = useState(false);
  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1);
      if (names[id]) {
        setPage(id);
        const group = groups.find((g) => g.items.some(([key]) => key === id));
        if (group) setExpanded([group.name]);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (id: string) => {
    setPage(id);
    window.history.replaceState(null, "", `#${id}`);
    const group = groups.find((g) => g.items.some(([key]) => key === id));
    if (group) setExpanded([group.name]);
    setMobile(false);
    setNotifications(false);
  };
  const notify = (text: string) => setToast(text);
  const channelOverview = (channel: Channel) => {
    const campaigns = s.campaigns.filter((c) => c.channel === channel),
      messages = s.messages.filter((m) => m.channel === channel);
    return (
      <>
        <Panel
          title={`${channel} overview`}
          description="Local workspace activity · No live provider connection."
          action={<Badge>Not connected</Badge>}
        >
          <div className="console-status-grid">
            <div>
              <strong>{campaigns.length}</strong>
              <small>Local campaigns</small>
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
                  ? "Scripted call previews"
                  : "Simulated messages"}
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
              <small>Contacts with consent & address</small>
            </div>
            <div>
              <strong>—</strong>
              <small>Provider-confirmed delivery</small>
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
                  "API status",
                  "Quality rating",
                  "Messaging limit",
                  "Display name status",
                ]
              : channel === "Email"
                ? [
                    "Mailbox authorization",
                    "Sender identity",
                    "Reply synchronization",
                    "DNS verification",
                  ]
                : [
                    "Telephony",
                    "Speech service",
                    "Recording storage",
                    "Calendar connection",
                  ]
            ).map((label) => (
              <div key={label}>
                <strong>—</strong>
                <small>{label}: Not connected</small>
              </div>
            ))}
          </div>
          <p>
            These statuses will come from the provider after authenticated
            onboarding and acceptance tests.
          </p>
        </Panel>
      </>
    );
  };
  let content;
  if (page === "overview")
    content = (
      <>
        <section className="console-welcome">
          <div>
            <span className="console-overline">YOUR OUTREACH, CONNECTED</span>
            <h1>
              Turn conversations
              <br />
              into opportunities.
            </h1>
            <p>
              WhatsApp, email and AI calling.
              <br />
              One clear view of every next step.
            </p>
            <div className="console-actions">
              <button className="primary" onClick={() => navigate("campaigns")}>
                <Plus size={16} /> Create campaign
              </button>
              <button
                className="secondary"
                onClick={() => navigate("contacts")}
              >
                Explore contacts
              </button>
            </div>
          </div>
          <div className="console-hero-mark" aria-hidden="true">
            <SalesMark size={76} />
            <span className="hero-channel one">
              <MessageCircle size={23} />
            </span>
            <span className="hero-channel two">
              <Mail size={23} />
            </span>
            <span className="hero-channel three">
              <Phone size={23} />
            </span>
          </div>
        </section>
        <div className="console-stats">
          <article>
            <span>Contacts</span>
            <strong>{s.contacts.length}</strong>
            <small>
              {s.contacts.filter((c) => c.consent && !c.optedOut).length} with
              consent
            </small>
          </article>
          <article>
            <span>Local campaigns</span>
            <strong>{s.campaigns.length}</strong>
            <small>
              {s.campaigns.filter((c) => c.status === "Draft").length} drafts
            </small>
          </article>
          <article>
            <span>Qualified leads</span>
            <strong>
              {s.contacts.filter((c) => c.stage === "Qualified").length}
            </strong>
            <small>Local qualification status</small>
          </article>
          <article>
            <span>Sample credits</span>
            <strong>{balance(s)}</strong>
            <small>No monetary value</small>
          </article>
        </div>
        <div className="console-card-grid">
          {channels.map((channel) => (
            <Panel
              title={channel}
              key={channel}
              action={<Badge>Not connected</Badge>}
            >
              <p>
                Build and review your local {channel.toLowerCase()} workflows.
              </p>
              <button
                className="text-button"
                onClick={() =>
                  navigate(
                    channel === "WhatsApp"
                      ? "wa-overview"
                      : channel === "Email"
                        ? "email-overview"
                        : "voice-overview",
                  )
                }
              >
                Open channel <ArrowUpRight size={16} />
              </button>
            </Panel>
          ))}
        </div>
        <Panel
          title="Recent workspace activity"
          action={
            <button
              className="text-button"
              onClick={() => navigate("analytics")}
            >
              View all
            </button>
          }
        >
          {s.activities
            .slice(-5)
            .reverse()
            .map((a) => (
              <div className="console-activity" key={a.id}>
                <span>{a.description}</span>
                <small>{date(a.at)}</small>
              </div>
            ))}
          {!s.activities.length && (
            <Empty>
              Your local actions will appear here. Start by adding a contact or
              creating a campaign.
            </Empty>
          )}
        </Panel>
      </>
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
        notify={notify}
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
  else if (["voice-overview", "wa-overview", "email-overview"].includes(page))
    content = channelOverview(
      page === "voice-overview"
        ? "AI calling"
        : page === "wa-overview"
          ? "WhatsApp"
          : "Email",
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
      <Panel
        title="WhatsApp verification"
        description="Manage your verification preparation after login."
      >
        <p>
          Application setup requires an authenticated account and workspace
          membership. A sample workspace cannot confirm verification or submit
          an application.
        </p>
        <a className="primary" href="/account/whatsapp-verification">
          {account
            ? "Manage verification preparation"
            : "Sign in to manage verification"}{" "}
          <ArrowUpRight size={16} />
        </a>
      </Panel>
    );
  else if (page === "tasks") content = <Tasks notify={notify} />;
  else if (
    [
      "wa-onboarding",
      "wa-health",
      "inbox-overview",
      "handoffs",
      "automation-handoffs",
      "sheets",
      "webhooks",
      "email-setup",
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
  return (
    <div className="outreach-console">
      {mobile && (
        <button
          className="console-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`console-sidebar ${mobile ? "open" : ""}`}>
        <a className="console-logo" href="/">
          <span>
            <SalesMark size={25} />
          </span>
          <strong>
            sprint<span>.</span>
          </strong>
          <small>BY SCALEZIX</small>
        </a>
        <div className="console-workspace-switch">
          <span>S</span>
          <div>
            <strong>{s.settings.name}</strong>
            <small>
              {account ? "Account workspace" : "Local sample workspace"}
            </small>
          </div>
        </div>
        <nav aria-label="Workspace navigation">
          <button
            className={`console-nav-item ${page === "overview" ? "active" : ""}`}
            aria-current={page === "overview" ? "page" : undefined}
            onClick={() => navigate("overview")}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <div className="console-nav-label">WORKSPACE & CHANNELS</div>
          {groups.map((group) => (
            <div className="console-nav-group" key={group.name}>
              <button
                className={`console-nav-item ${group.items.some(([id]) => id === page) ? "group-selected" : ""}`}
                aria-expanded={expanded.includes(group.name)}
                aria-controls={`group-${group.name.replaceAll(" ", "-")}`}
                onClick={() =>
                  setExpanded((current) =>
                    current.includes(group.name) ? [] : [group.name],
                  )
                }
              >
                <group.icon size={18} />
                {group.name}
                <ChevronDown
                  size={15}
                  className={expanded.includes(group.name) ? "rotated" : ""}
                />
              </button>
              {expanded.includes(group.name) && (
                <div
                  className="console-subnav"
                  id={`group-${group.name.replaceAll(" ", "-")}`}
                >
                  {group.items.map(([id, title]) => (
                    <button
                      key={id}
                      aria-current={page === id ? "page" : undefined}
                      className={page === id ? "active" : ""}
                      onClick={() => navigate(id)}
                    >
                      <i />
                      {title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <a
          className="console-account-link"
          href={account ? "/account/manage" : "/account"}
        >
          <span>SK</span>
          <div>
            <strong>{account ? account.email : "Account workspace"}</strong>
            <small>
              {account
                ? `${account.role} · Account controls`
                : "Sign in for secure account access"}
            </small>
          </div>
          <ArrowUpRight size={16} />
        </a>
      </aside>
      <main className="console-main">
        <header className="console-topbar">
          <div className="console-breadcrumb">
            <button
              className="icon-button console-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
              <span className="console-menu-text">Modules</span>
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{names[page]}</strong>
          </div>
          <div className="console-actions">
            <button
              className="console-credit-button"
              onClick={() => navigate("billing")}
            >
              <Wallet size={15} />
              <strong>{balance(s)}</strong>
              <span>sample credits</span>
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              aria-expanded={notifications}
              onClick={() => setNotifications((v) => !v)}
            >
              <Bell size={19} />
            </button>
            {account ? (
              <button
                className="console-signin"
                onClick={async () => {
                  if (
                    (saveStatus.startsWith("Saving") ||
                      saveStatus.startsWith("Unsaved")) &&
                    !window.confirm(
                      "Changes may be unsaved. Export your backup before signing out. Sign out now?",
                    )
                  )
                    return;
                  const client = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                  );
                  const { error } = await client.auth.signOut();
                  if (error) notify("Sign out failed. Try again.");
                  else location.href = "/login";
                }}
              >
                Sign out
              </button>
            ) : (
              <a href="/login" className="console-signin">
                Sign in
              </a>
            )}
          </div>
        </header>
        {notifications && (
          <aside className="console-notifications">
            <h3>Workspace notifications</h3>
            {!s.settings.notifications ? (
              <p>Local notifications are disabled in Settings.</p>
            ) : (
              <>
                <p>
                  {balance(s) <= s.settings.lowBalance
                    ? "Sample balance is below your threshold."
                    : "Sample credit balance is above your threshold."}
                </p>
                <p>
                  {s.tasks.filter((t) => !t.done).length} pending follow-up
                  tasks.
                </p>
                <p>No live provider alerts.</p>
              </>
            )}
          </aside>
        )}
        <div className="console-local-banner">
          <ShieldCheck size={16} />
          <span>
            {account
              ? "Draft workspace · Saved to your account. Live messages, calls, applications and payments are disabled."
              : "Local preview · Data stays in this browser. No live messages, calls, applications or payments."}
          </span>
        </div>
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
          {account && (
            <div className="console-save-status" role="status">
              <span>{saveStatus}</span>
              <a href="/account/manage">Account & security</a>
            </div>
          )}
          {account && !canEdit && (
            <div className="console-error">
              Draft editors are read-only. Owners and administrators can edit
              after authenticator verification in{" "}
              <a href="/account/manage">Account & security</a>.
            </div>
          )}
          {!ready ? (
            <Empty>Loading your workspace…</Empty>
          ) : (
            <div key={page}>
              {page !== "overview" && (
                <div className="console-page-title">
                  <span className="console-overline">
                    YOUR WORKSPACE, CONNECTED
                  </span>
                  <h1>{names[page]}</h1>
                </div>
              )}
              {content}
            </div>
          )}
        </div>
        <footer className="console-footer">
          Built for focused outreach. <span>WhatsApp · Email · AI Calling</span>
        </footer>
      </main>
      {toast && (
        <div className="console-toast" role="status">
          {toast}
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
