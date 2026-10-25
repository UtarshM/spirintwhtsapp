"use client";
import SalesMark from '@/components/sales-mark';
import { useState, useEffect, useRef } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ContactRound,
  CreditCard,
  Download,
  Ellipsis,
  FileText,
  GitBranch,
  Headphones,
  HelpCircle,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  initialContacts,
  integrations,
  stages,
  type Contact,
} from "@/lib/demo";
const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Contacts", icon: Users },
  { label: "Inbox", icon: MessageCircle },
  { label: "Campaigns", icon: Megaphone },
  { label: "Sequences", icon: GitBranch },
  { label: "Templates", icon: FileText },
  { label: "AI calling", icon: AudioLines },
  { label: "Analytics", icon: BarChart3 },
];
type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  audience: number;
};
export default function Workspace() {
  const [page, setPage] = useState("Overview"),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [contacts, setContacts] = useState<Contact[]>(initialContacts),
    [campaigns, setCampaigns] = useState<Campaign[]>([
      {
        id: "sample1",
        name: "A warmer welcome",
        channel: "WhatsApp",
        status: "Sample",
        audience: 1240,
      },
      {
        id: "sample2",
        name: "Let’s pick up the conversation",
        channel: "Email",
        status: "Sample",
        audience: 860,
      },
      {
        id: "sample3",
        name: "Your next discovery call",
        channel: "AI calling",
        status: "Draft",
        audience: 120,
      },
    ]),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [tab, setTab] = useState("All channels"),
    [selected, setSelected] = useState("1"),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState<string[]>([]),
    [steps, setSteps] = useState([
      "WhatsApp message",
      "Wait 1 day",
      "Email follow-up",
    ]),
    [savedSequence, setSavedSequence] = useState(false),
    [period, setPeriod] = useState("Last 7 days");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    contacts: Contact[];
    duplicates: number;
  } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {},
  );
  useEffect(() => {
    try {
      const c = localStorage.getItem("relay-contacts");
      const a = localStorage.getItem("relay-campaigns");
      if (c) setContacts(JSON.parse(c));
      if (a) setCampaigns(JSON.parse(a));
      const seq = localStorage.getItem("relay-sequence");
      if (seq) setSteps(JSON.parse(seq));
      for (const kind of ["voice", "template"]) {
        const draft = localStorage.getItem("relay-" + kind);
        if (draft) setDrafts((d) => ({ ...d, [kind]: JSON.parse(draft) }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!modal) return;
    const old = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button,a[href],input,select,textarea",
        ) || [],
      );
    focusable()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setModal("");
      if (e.key === "Tab") {
        const items = focusable();
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, [modal]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  function notify(s: string) {
    setToast(s);
  }
  function navigate(s: string) {
    setPage(s);
    setSearch("");
    setMobile(false);
  }
  function saveContacts(c: Contact[]) {
    setContacts(c);
    localStorage.setItem("relay-contacts", JSON.stringify(c));
  }
  function saveCampaign(c: Campaign[]) {
    setCampaigns(c);
    localStorage.setItem("relay-campaigns", JSON.stringify(c));
  }
  const filtered = contacts.filter((c) =>
    `${c.name} ${c.company} ${c.email} ${c.tags.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  function exportContacts() {
    const rows = [
      ["Name", "Company", "Email", "Phone", "Lead status"],
      ...filtered.map((c) => [c.name, c.company, c.email, c.phone, c.stage]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "relay-sample-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Sample contacts exported");
  }
  function heading(title: string, subtitle: string, action?: React.ReactNode) {
    return (
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, CONNECTED</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
    );
  }
  const newButton = (
    <button className="primary" onClick={() => setModal("campaign")}>
      <Plus size={17} /> Create campaign
    </button>
  );
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="/">
          <span className="brand-icon">
            <SalesMark size={25} />
          </span>
          sprint<span className="brand-dot">.</span>
        </a>
        <div className="byline">BY SCALEZIX</div>
        <button
          className="workspace-switch"
          onClick={() =>
            notify(
              "Sample workspace · Connect Supabase to create your business workspace",
            )
          }
        >
          <span className="workspace-avatar">S</span>
          <span>
            Scalezix workspace<small>Sample workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.label}
              onClick={() => navigate(n.label)}
              className={page === n.label ? "nav-item active" : "nav-item"}
            >
              <n.icon size={18} />
              {n.label}
              {n.label === "Inbox" && <span className="nav-count">3</span>}
              {n.label === "AI calling" && <span className="ai-label">AI</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label manage-label">MANAGE</div>
        <nav>
          {[
            { label: "Integrations", icon: Link2 },
            { label: "Credits & billing", icon: Wallet },
            { label: "Settings", icon: Settings },
          ].map((n) => (
            <button
              key={n.label}
              className={page === n.label ? "nav-item active" : "nav-item"}
              onClick={() => navigate(n.label)}
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <Sparkles size={17} />
            </span>
            <strong>A little help, a lot of growth.</strong>
            <p>Let’s get your first campaign going.</p>
            <button onClick={() => setModal("guide")}>
              Explore the setup guide <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="profile" onClick={() => navigate("Settings")}>
            <span className="avatar">SK</span>
            <span>
              Scalezix team<small>Workspace administrator</small>
            </span>
            <Ellipsis size={17} />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="preview-pill">
              <span /> Sample workspace
            </span>
            <button
              className="credit-balance"
              onClick={() => navigate("Credits & billing")}
            >
              <Wallet size={16} />
              <strong>0</strong>
              <span>credits</span>
              <Plus size={14} />
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => setModal("notifications")}
            >
              <Bell size={19} />
              <i />
            </button>
            <button className="top-avatar" onClick={() => navigate("Settings")}>
              SK
            </button>
          </div>
        </header>
        <div className="content">
          {page === "Overview" && (
            <>
              {heading(
                "A good day to grow.",
                "Your conversations, campaigns, and next opportunities — all in one place.",
                <button
                  className="secondary date-filter"
                  onClick={() =>
                    setPeriod(
                      period === "Last 7 days" ? "Last 30 days" : "Last 7 days",
                    )
                  }
                >
                  <Clock size={15} />
                  {period}
                  <ChevronDown size={14} />
                </button>,
              )}
              <section className="welcome-banner">
                <div className="banner-text">
                  <span className="banner-label">
                    <span /> MORE CONNECTIONS. MORE POSSIBILITIES.
                  </span>
                  <h2>
                    Great sales start with
                    <br />a real conversation.
                  </h2>
                  <p>
                    Reach out on WhatsApp, email, and AI calls.
                    <br />
                    Keep the conversation moving, from hello to closed.
                  </p>
                  <div className="banner-actions">
                    {newButton}
                    <button onClick={() => navigate("Sequences")}>
                      Explore sequences <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="orbit-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <div className="orbit-center">
                    <SalesMark size={42} />
                  </div>
                  <div className="orbit-node whatsapp">
                    <MessageCircle size={25} />
                  </div>
                  <div className="orbit-node email">
                    <Mail size={24} />
                  </div>
                  <div className="orbit-node call">
                    <Phone size={22} />
                  </div>
                  <div className="floating-card">
                    <span className="success-check">
                      <Check size={14} />
                    </span>
                    <span>
                      A conversation worth starting
                      <small>Every channel. One workspace.</small>
                    </span>
                  </div>
                  <span className="spark spark-one">✧</span>
                  <span className="spark spark-two">✦</span>
                </div>
              </section>
              <div className="section-caption">
                <span>YOUR MOMENTUM</span>
                <span className="sample-note">
                  Illustrative metrics <HelpCircle size={13} />
                </span>
              </div>
              <div className="stats-grid">
                {[
                  {
                    name: "Total contacts",
                    value: contacts.length.toLocaleString(),
                    detail: "In your sample workspace",
                    icon: Users,
                    color: "blue",
                  },
                  {
                    name: "Messages sent",
                    value: "2,480",
                    detail: "+18.6% from previous period",
                    icon: Send,
                    color: "purple",
                  },
                  {
                    name: "Engaged leads",
                    value: "186",
                    detail: "+12.4% from previous period",
                    icon: Target,
                    color: "green",
                  },
                  {
                    name: "AI conversations",
                    value: "64",
                    detail: "3m 24s average duration",
                    icon: AudioLines,
                    color: "orange",
                  },
                ].map((s, i) => (
                  <div className="stat-card" key={s.name}>
                    <div className="stat-top">
                      <span>{s.name}</span>
                      <span className={"stat-icon " + s.color}>
                        <s.icon size={17} />
                      </span>
                    </div>
                    <strong>{s.value}</strong>
                    <div
                      className={
                        i === 1 || i === 2
                          ? "stat-detail positive"
                          : "stat-detail"
                      }
                    >
                      {(i === 1 || i === 2) && <ArrowUpRight size={13} />}{" "}
                      {s.detail}
                    </div>
                    <svg
                      className={"mini-spark " + s.color}
                      viewBox="0 0 100 32"
                      aria-hidden="true"
                    >
                      <path
                        d={
                          i % 2
                            ? "M0 29 L14 23 L25 26 L40 12 L53 17 L67 7 L80 11 L100 1"
                            : "M0 28 L16 28 L28 19 L40 23 L55 12 L69 15 L82 4 L100 4"
                        }
                      />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Conversations over time</h3>
                      <p>A little consistency goes a long way.</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="View analytics"
                      onClick={() => navigate("Analytics")}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-dot green" />
                      WhatsApp
                    </span>
                    <span>
                      <i className="legend-dot blue" />
                      Email
                    </span>
                    <span>
                      <i className="legend-dot purple" />
                      AI calls
                    </span>
                  </div>
                  <div className="chart">
                    <div className="y-labels">
                      <span>600</span>
                      <span>450</span>
                      <span>300</span>
                      <span>150</span>
                      <span>0</span>
                    </div>
                    <div className="chart-plot">
                      <div className="gridlines">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <svg
                        viewBox="0 0 600 180"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label="Illustrative conversation trends for the last seven days"
                      >
                        <defs>
                          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="0%"
                              stopColor="#3c73f4"
                              stopOpacity=".13"
                            />
                            <stop
                              offset="100%"
                              stopColor="#3c73f4"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 150 C35 145 55 100 100 110 S165 157 200 110 S260 135 300 79 S370 100 400 55 S465 92 500 48 S565 48 600 12 L600 180 L0 180Z"
                          fill="url(#fill)"
                        />
                        <path
                          className="line blue"
                          d="M0 150 C35 145 55 100 100 110 S165 157 200 110 S260 135 300 79 S370 100 400 55 S465 92 500 48 S565 48 600 12"
                        />
                        <path
                          className="line green"
                          d="M0 160 C40 160 60 132 100 140 S160 163 200 135 S265 150 300 112 S360 125 400 93 S465 110 500 74 S560 80 600 47"
                        />
                        <path
                          className="line purple"
                          d="M0 174 C50 170 65 160 100 161 S160 175 200 158 S265 160 300 145 S360 149 400 136 S460 140 500 119 S565 130 600 104"
                        />
                      </svg>
                      <div className="x-labels">
                        {[
                          "Mon, 19",
                          "Tue, 20",
                          "Wed, 21",
                          "Thu, 22",
                          "Fri, 23",
                          "Sat, 24",
                          "Sun, 25",
                        ].map((d) => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
                <section className="panel connection-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Your channels</h3>
                      <p>Connect once. Start more conversations.</p>
                    </div>
                    <Link2 size={18} />
                  </div>
                  {integrations
                    .filter((i) => i.name !== "Zoho Mail")
                    .map((i) => (
                      <div className="channel-row" key={i.name}>
                        <span className={"channel-icon " + i.kind}>
                          {i.kind === "whatsapp" ? (
                            <MessageCircle size={19} />
                          ) : i.kind === "email" ? (
                            <Mail size={19} />
                          ) : (
                            <AudioLines size={19} />
                          )}
                        </span>
                        <div>
                          <strong>{i.name}</strong>
                          <small>Not connected</small>
                        </div>
                        <button onClick={() => navigate("Integrations")}>
                          Connect <ArrowUpRight size={13} />
                        </button>
                      </div>
                    ))}
                  <button
                    className="all-integrations"
                    onClick={() => navigate("Integrations")}
                  >
                    Manage integrations <ArrowRight size={14} />
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div className="heading-inline">
                    <h3>Recent campaigns</h3>
                    <span className="count-badge">{campaigns.length}</span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("Campaigns")}
                  >
                    View all campaigns <ArrowRight size={14} />
                  </button>
                </div>
                <CampaignTable
                  campaigns={campaigns}
                  onOpen={() => navigate("Campaigns")}
                />
              </section>
              <div className="footer-note">
                <ShieldCheck size={14} /> Built for better conversations.
                Designed around your customers.<span>Sprint by Scalezix</span>
              </div>
            </>
          )}
          {page === "Contacts" && (
            <>
              {heading(
                "People, not just contacts.",
                "Organize your audience and make every conversation personal.",
                <div className="button-group">
                  <button
                    className="secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Download size={16} /> Import CSV
                  </button>
                  <button
                    className="primary"
                    onClick={() => setModal("contact")}
                  >
                    <Plus size={17} /> Add contact
                  </button>
                </div>,
              )}
              <input
                hidden
                type="file"
                accept=".csv"
                ref={fileRef}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const { parseContactCsv } = await import("@/lib/csv");
                    const result = parseContactCsv(await f.text(), contacts);
                    if (result.errors.length) {
                      notify(result.errors.slice(0, 2).join("; "));
                      return;
                    }
                    setPendingImport(result);
                    setModal("import");
                  } catch {
                    notify("Could not import this CSV");
                  }
                  e.target.value = "";
                }}
              />
              <div className="panel">
                <div className="table-tools">
                  <div className="search">
                    <Search size={17} />
                    <input
                      aria-label="Search contacts"
                      placeholder="Search people, companies, or tags…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button className="secondary" onClick={exportContacts}>
                    <Download size={15} /> Export sample
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Lead status</th>
                        <th>Tags</th>
                        <th>Consent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="person-cell">
                              <span className="contact-avatar">
                                {c.name
                                  .split(" ")
                                  .map((s) => s[0])
                                  .join("")}
                              </span>
                              <strong>{c.name}</strong>
                            </div>
                          </td>
                          <td>{c.company}</td>
                          <td>
                            {c.email}
                            <small>{c.phone}</small>
                          </td>
                          <td>
                            <select
                              aria-label={`Lead status for ${c.name}`}
                              value={stages.includes(c.stage) ? c.stage : "Contacted"}
                              onChange={(e) =>
                                saveContacts(
                                  contacts.map((x) =>
                                    x.id === c.id
                                      ? { ...x, stage: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            >
                              {stages.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {c.tags.map((t) => (
                              <span className="tag" key={t}>
                                {t}
                              </span>
                            ))}
                          </td>
                          <td>
                            <span
                              className={
                                "status " + (c.consent ? "green" : "amber")
                              }
                            >
                              {c.consent ? "Recorded" : "Not recorded"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div className="empty">No contacts match your search.</div>
                  )}
                </div>
                <div className="table-footer">
                  {filtered.length} contacts · Local sample data
                </div>
              </div>
            </>
          )}
          {page === "Campaigns" && (
            <>
              {heading(
                "Make your next move.",
                "Thoughtful outreach, across every channel.",
                newButton,
              )}
              <div className="panel">
                <div className="tabs">
                  {["All channels", "WhatsApp", "Email", "AI calling"].map(
                    (t) => (
                      <button
                        key={t}
                        className={tab === t ? "selected" : ""}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
                <CampaignTable
                  campaigns={campaigns.filter(
                    (c) => tab === "All channels" || c.channel === tab,
                  )}
                  onOpen={(c) =>
                    notify(
                      `${c.name}: ${c.status}. Connect a verified provider before launching.`,
                    )
                  }
                />
              </div>
            </>
          )}
          {page === "Inbox" && (
            <>
              {heading(
                "Every conversation, together.",
                "Your team’s shared space for the next great customer experience.",
              )}
              <div className="inbox panel">
                <div className="inbox-list">
                  <div className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search conversations"
                      placeholder="Find a conversation"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {filtered.slice(0, 5).map((c, i) => (
                    <button
                      className={
                        selected === c.id
                          ? "conversation active"
                          : "conversation"
                      }
                      key={c.id}
                      onClick={() => {
                        setSelected(c.id);
                        setMessages([]);
                      }}
                    >
                      <span className="contact-avatar">{c.name[0]}</span>
                      <div>
                        <strong>{c.name}</strong>
                        <p>
                          {i === 0
                            ? "Could you share a little more?"
                            : "Thanks for reaching out!"}
                        </p>
                      </div>
                      <small>{i + 2}m</small>
                    </button>
                  ))}
                </div>
                <div className="chat">
                  <div className="chat-header">
                    <div>
                      <strong>
                        {contacts.find((c) => c.id === selected)?.name}
                      </strong>
                      <small>WhatsApp · Sample conversation</small>
                    </div>
                    <span className="status green">Open</span>
                  </div>
                  <div className="chat-messages">
                    <span className="chat-date">Sample conversation</span>
                    <div className="bubble outgoing">
                      Hi! Thanks for your interest in Sprint. How can we help
                      your team grow?
                      <small>
                        10:24 AM <CheckCheck size={12} />
                      </small>
                    </div>
                    <div className="bubble incoming">
                      Could you share a little more about WhatsApp campaigns and
                      AI calling?<small>10:26 AM</small>
                    </div>
                    {messages.map((m, i) => (
                      <div className="bubble outgoing" key={i}>
                        {m}
                        <small>Local draft · Not sent</small>
                      </div>
                    ))}
                  </div>
                  <form
                    className="composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (message.trim()) {
                        setMessages([...messages, message.trim()]);
                        setMessage("");
                        notify(
                          "Saved locally as a draft. No message was sent.",
                        );
                      }
                    }}
                  >
                    <input
                      aria-label="Message draft"
                      placeholder="Write a sample reply…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button className="primary" aria-label="Save reply draft">
                      <Send size={17} />
                    </button>
                  </form>
                  <div className="composer-note">
                    <ShieldCheck size={12} /> Preview only. Connect WhatsApp to
                    send real messages.
                  </div>
                </div>
              </div>
            </>
          )}
          {page === "Sequences" && (
            <>
              {heading(
                "Good follow-ups, on autopilot.",
                "Build a journey that knows when to reach out — and when to listen.",
                <button
                  className="primary"
                  onClick={() => {
                    localStorage.setItem(
                      "relay-sequence",
                      JSON.stringify(steps),
                    );
                    setSavedSequence(true);
                    notify("Sequence draft saved locally");
                  }}
                >
                  <Check size={16} /> Save draft
                </button>,
              )}
              <div className="sequence-layout">
                <section className="panel sequence-settings">
                  <h3>New lead nurture</h3>
                  <p>A thoughtful first conversation.</p>
                  <label>
                    Enrollment trigger
                    <select>
                      <option>Manual enrollment</option>
                    </select>
                  </label>
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <span>
                      Stops automatically on reply, opt-out, or human handoff.
                    </span>
                  </div>
                  <h4>Add a step</h4>
                  {[
                    "WhatsApp message",
                    "Email follow-up",
                    "AI call",
                    "Wait 1 day",
                    "Condition",
                    "Human handoff",
                  ].map((s) => (
                    <button
                      className="step-option"
                      key={s}
                      onClick={() => {
                        setSteps([...steps, s]);
                        setSavedSequence(false);
                      }}
                    >
                      <Plus size={16} />
                      {s}
                    </button>
                  ))}
                </section>
                <section className="sequence-canvas">
                  <div className="trigger-node">
                    <Zap size={18} /> Contact enrolled
                  </div>
                  {steps.map((s, i) => (
                    <div className="step-wrap" key={i}>
                      <div className="connector" />
                      <div className="sequence-node">
                        <span
                          className={
                            "channel-icon " +
                            (s.includes("WhatsApp")
                              ? "whatsapp"
                              : s.includes("Email")
                                ? "email"
                                : "voice")
                          }
                        >
                          {s.includes("Wait") ? (
                            <Clock size={18} />
                          ) : s.includes("call") ? (
                            <Phone size={18} />
                          ) : (
                            <MessageCircle size={18} />
                          )}
                        </span>
                        <div>
                          <small>STEP {i + 1}</small>
                          <strong>{s}</strong>
                          <span>
                            {s.includes("Wait")
                              ? "Respect working days and time windows"
                              : "Configure before publishing"}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Remove step ${i + 1}`}
                          onClick={() =>
                            setSteps(steps.filter((_, j) => j !== i))
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="connector" />
                  <div className="end-node">
                    <Check size={14} /> Journey complete
                  </div>
                  <p className="sample-note">
                    {savedSequence
                      ? "Draft saved on this browser"
                      : "Draft builder · Publishing requires a connected workspace"}
                  </p>
                </section>
              </div>
            </>
          )}
          {page === "Templates" && (
            <>
              {heading(
                "The right words, ready.",
                "Create a consistent voice across your customer conversations.",
                <button
                  className="primary"
                  onClick={() => setModal("template")}
                >
                  <Plus size={16} /> New template
                </button>,
              )}
              <div className="template-grid">
                {[
                  "A warm welcome",
                  "A timely follow-up",
                  "Let’s find a time",
                  "Your questions, answered",
                ].map((t, i) => (
                  <section className="panel template-card" key={t}>
                    <span
                      className={
                        "channel-icon " + (i % 2 ? "email" : "whatsapp")
                      }
                    >
                      {i % 2 ? <Mail size={20} /> : <MessageCircle size={20} />}
                    </span>
                    <h3>{t}</h3>
                    <p>
                      Hi {"{{first_name}}"}, thanks for connecting with{" "}
                      {"{{company}}"}. We’d love to learn more about what you’re
                      looking for.
                    </p>
                    <div>
                      <span className="status gray">Sample draft</span>
                      <button
                        className="text-button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            `Hi {{first_name}}, thanks for connecting with {{company}}.`,
                          );
                          notify("Template text copied");
                        }}
                      >
                        Copy <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "Integrations" && (
            <>
              {heading(
                "Your tools. Better together.",
                "Connect the channels that bring you closer to your customers.",
              )}
              <div className="notice full">
                <ShieldCheck size={20} />
                <span>
                  Connections are workspace-specific. Credentials are encrypted
                  server-side; sample mode never stores provider secrets.
                </span>
              </div>
              <section className="panel integration-card" style={{marginBottom:24}}>
                <h2>WhatsApp blue tick verification</h2>
                <span className="status gray">Guidance only · Account not connected</span>
                <p>Prepare your business details and review the verification options available through Meta. Badge approval is decided by Meta and is not guaranteed or included with your Sprint subscription.</p>
                <a className="secondary" href="/account/whatsapp-verification">Sign in to manage verification <ArrowUpRight size={15}/></a>
              </section>
              <div className="integration-grid">
                {integrations.map((i) => (
                  <section className="panel integration-card" key={i.name}>
                    <div className="integration-top">
                      <span className={"channel-icon " + i.kind}>
                        {i.kind === "voice" ? (
                          <AudioLines size={26} />
                        ) : i.kind === "email" ? (
                          <Mail size={26} />
                        ) : (
                          <MessageCircle size={26} />
                        )}
                      </span>
                      <span className="status gray">Not connected</span>
                    </div>
                    <h2>{i.name}</h2>
                    <small>{i.provider}</small>
                    <p>{i.description}</p>
                    <button
                      className="secondary"
                      onClick={() => setModal("connect:" + i.name)}
                    >
                      Connect {i.name}
                      <ArrowUpRight size={15} />
                    </button>
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "AI calling" && (
            <>
              {heading(
                "A more human first hello.",
                "Build voice agents that listen, qualify, and hand off with context.",
                <button className="primary" onClick={() => setModal("voice")}>
                  <Plus size={16} /> Create voice agent
                </button>,
              )}
              <section className="voice-hero panel">
                <span className="voice-orb">
                  <AudioLines size={48} />
                </span>
                <h2>Your next conversation starts here.</h2>
                <p>
                  Hindi and English voice agents, powered by Plivo.
                  <br />
                  Connect your voice stack to start testing real conversations.
                </p>
                <button
                  className="primary"
                  onClick={() => navigate("Integrations")}
                >
                  Set up AI calling <ArrowRight size={16} />
                </button>
              </section>
              <div className="three-grid">
                {[
                  {
                    title: "Listen with context",
                    text: "Knowledge, instructions, and qualification questions tailored to your business.",
                    icon: BookOpen,
                  },
                  {
                    title: "Know when to hand off",
                    text: "Route interested leads to a person, with a transcript and the full conversation.",
                    icon: Headphones,
                  },
                  {
                    title: "Stay in control",
                    text: "Working hours, duration limits, concurrency controls, and credit reservations.",
                    icon: ShieldCheck,
                  },
                ].map((i) => (
                  <div className="panel feature-card" key={i.title}>
                    <i.icon size={23} />
                    <h3>{i.title}</h3>
                    <p>{i.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {page === "Analytics" && (
            <>
              {heading(
                "Clarity for your next move.",
                "Measure real outcomes, not just more activity.",
              )}
              <div className="notice full">
                <Activity size={19} />
                <span>
                  No live activity yet. Connect a provider and complete your
                  first campaign to see verified results.
                </span>
              </div>
              <div className="stats-grid">
                {[
                  "Messages delivered",
                  "Replies received",
                  "Calls completed",
                  "Credits consumed",
                ].map((t) => (
                  <div className="stat-card" key={t}>
                    <span>{t}</span>
                    <strong>0</strong>
                    <small>No production events</small>
                  </div>
                ))}
              </div>
              <section className="panel empty">
                <BarChart3 size={40} />
                <h2>Your growth story starts here.</h2>
                <p>
                  Channel performance, delivery outcomes, and campaign costs
                  will appear after live activity.
                </p>
                <button
                  className="secondary"
                  onClick={() => navigate("Integrations")}
                >
                  Connect your channels
                </button>
              </section>
            </>
          )}
          {page === "Credits & billing" && (
            <>
              {heading(
                "One balance. Every channel.",
                "Clear costs and complete control over your outreach.",
                <button className="primary" onClick={() => setModal("credits")}>
                  <Plus size={16} /> Add credits
                </button>,
              )}
              <div className="billing-grid">
                <section className="balance-card">
                  <span>AVAILABLE BALANCE</span>
                  <h2>
                    0 <small>credits</small>
                  </h2>
                  <p>Prepaid. Transparent. Always in your control.</p>
                  <div>
                    <span>
                      Reserved <strong>0 credits</strong>
                    </span>
                    <span>
                      Used this month <strong>0 credits</strong>
                    </span>
                  </div>
                </section>
                <section className="panel plan-card">
                  <span className="eyebrow">YOUR SUBSCRIPTION</span>
                  <h2>Ready when you are.</h2>
                  <p>
                    Plans and channel rates will be published once commercial
                    pricing is approved.
                  </p>
                  <span className="status amber">Checkout not enabled</span>
                  <p className="sample-note">
                    Payments securely processed by Razorpay.
                  </p>
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Credit history</h3>
                  <span className="status gray">No transactions</span>
                </div>
                <div className="empty">
                  <Wallet size={32} />
                  <h3>A clean slate.</h3>
                  <p>
                    Purchases, reservations, usage, and refunds will appear
                    here.
                  </p>
                </div>
              </section>
            </>
          )}
          {page === "Settings" && (
            <>
              {heading(
                "Make this workspace yours.",
                "Your team, preferences, and sending boundaries.",
              )}
              <section className="panel settings-panel">
                <div className="tabs">
                  {["Workspace", "Working days", "Security"].map((t) => (
                    <button
                      className={tab === t ? "selected" : ""}
                      key={t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {tab === "Working days" ? (
                  <Schedule
                    onSave={() =>
                      notify(
                        "Sample schedule saved locally. Live workers require a connected workspace.",
                      )
                    }
                  />
                ) : tab === "Security" ? (
                  <div className="settings-body">
                    <h3>Security by default</h3>
                    <p>
                      Workspace permissions, MFA, encrypted credentials, and
                      audit history are enforced in the connected environment.
                    </p>
                    <div className="notice">
                      <ShieldCheck size={22} />
                      <span>
                        Supabase is not configured. Sign-in and security
                        enrollment are unavailable in sample mode.
                      </span>
                    </div>
                    <a className="primary link-button" href="/login">
                      Go to sign in <ArrowRight size={15} />
                    </a>
                  </div>
                ) : (
                  <form
                    className="settings-body"
                    onSubmit={(e) => {
                      e.preventDefault();
                      notify("Sample preferences saved");
                    }}
                  >
                    <h3>Workspace details</h3>
                    <label>
                      Workspace name
                      <input defaultValue="Scalezix workspace" required />
                    </label>
                    <label>
                      Timezone
                      <select>
                        <option>Asia/Kolkata</option>
                        <option>Europe/London</option>
                        <option>America/New_York</option>
                      </select>
                    </label>
                    <label>
                      Product name
                      <input defaultValue="Sprint by Scalezix" required />
                    </label>
                    <button className="primary">Save preferences</button>
                  </form>
                )}
              </section>
            </>
          )}
          {(page === "Templates" || page === "AI calling") &&
            drafts[page === "Templates" ? "template" : "voice"] && (
              <section
                className="panel settings-body"
                style={{ marginTop: 24 }}
              >
                <span className="status gray">Saved local draft</span>
                <h3 style={{ marginTop: 15 }}>
                  {drafts[page === "Templates" ? "template" : "voice"].name}
                </h3>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {drafts[page === "Templates" ? "template" : "voice"].content}
                </p>
              </section>
            )}
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={modal}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal("")}
            >
              <X size={20} />
            </button>
            {modal === "import" && pendingImport ? (
              <>
                <span className="modal-symbol">
                  <Users size={25} />
                </span>
                <h2>Review your import.</h2>
                <p>
                  {pendingImport.contacts.length} valid contacts ·{" "}
                  {pendingImport.duplicates} duplicates skipped.
                </p>
                <div className="notice">
                  {pendingImport.contacts.filter((c) => c.consent).length}{" "}
                  contacts explicitly record consent. Contacts without consent
                  cannot receive outreach.
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingImport.contacts.slice(0, 5).map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{c.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="primary"
                  style={{ marginTop: 20 }}
                  onClick={() => {
                    saveContacts([...contacts, ...pendingImport.contacts]);
                    notify(
                      `${pendingImport.contacts.length} contacts imported`,
                    );
                    setPendingImport(null);
                    setModal("");
                  }}
                >
                  Confirm import
                </button>
              </>
            ) : modal === "contact" ? (
              <>
                <span className="modal-symbol">
                  <Users size={25} />
                </span>
                <h2>A new connection.</h2>
                <p>Add a contact to your sample workspace.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    saveContacts([
                      ...contacts,
                      {
                        id: crypto.randomUUID(),
                        name: String(d.get("name")),
                        company: String(d.get("company")),
                        email: String(d.get("email")),
                        phone: String(d.get("phone")),
                        stage: "New",
                        tags: [],
                        consent: d.get("consent") === "on",
                      },
                    ]);
                    setModal("");
                    notify("Contact added to sample workspace");
                  }}
                >
                  <label>
                    Full name
                    <input
                      name="name"
                      required
                      maxLength={100}
                      placeholder="e.g. Aarav Mehta"
                    />
                  </label>
                  <label>
                    Company
                    <input
                      name="company"
                      maxLength={150}
                      placeholder="Company name"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="name@company.com"
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      name="phone"
                      pattern="\+[1-9][0-9]{7,14}"
                      placeholder="+919876543210"
                    />
                  </label>
                  <label className="checkbox-label">
                    <input name="consent" type="checkbox" /> This person has
                    provided outreach consent.
                  </label>
                  <button className="primary">Add contact</button>
                </form>
              </>
            ) : modal === "campaign" ? (
              <>
                <span className="modal-symbol">
                  <Megaphone size={25} />
                </span>
                <h2>Your next conversation.</h2>
                <p>Create a campaign draft. Nothing will be sent.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    saveCampaign([
                      {
                        id: crypto.randomUUID(),
                        name: String(d.get("name")),
                        channel: String(d.get("channel")),
                        status: "Draft",
                        audience: contacts.filter((c) => c.consent).length,
                      },
                      ...campaigns,
                    ]);
                    setModal("");
                    navigate("Campaigns");
                    notify("Campaign draft saved locally");
                  }}
                >
                  <label>
                    Campaign name
                    <input
                      name="name"
                      required
                      maxLength={120}
                      placeholder="Give this campaign a name"
                    />
                  </label>
                  <label>
                    Channel
                    <select name="channel">
                      <option>WhatsApp</option>
                      <option>Email</option>
                      <option>AI calling</option>
                    </select>
                  </label>
                  <div className="notice">
                    <Users size={18} />
                    <span>
                      {contacts.filter((c) => c.consent).length} sample contacts
                      have recorded consent. Audience is checked again before
                      sending.
                    </span>
                  </div>
                  <button className="primary">
                    Create draft <ArrowRight size={16} />
                  </button>
                </form>
              </>
            ) : modal.startsWith("connect:") ? (
              <>
                <span className="modal-symbol">
                  <Link2 size={25} />
                </span>
                <h2>Connect {modal.split(":")[1]}</h2>
                <p>A secure connection starts with your workspace.</p>
                <div className="notice">
                  <ShieldCheck size={21} />
                  <span>
                    Configure Supabase authentication and this provider’s
                    application credentials to enable verified onboarding. No
                    credentials are collected in sample mode.
                  </span>
                </div>
                <a className="primary link-button" href="/login">
                  Sign in to connect <ArrowRight size={16} />
                </a>
              </>
            ) : modal === "credits" ? (
              <>
                <span className="modal-symbol">
                  <Wallet size={25} />
                </span>
                <h2>Credits that keep you connected.</h2>
                <p>
                  Razorpay checkout will be available when your workspace is
                  authenticated and credit rates are approved.
                </p>
                <div className="notice">
                  <ShieldCheck size={22} />
                  <span>
                    Payments are currently disabled. Your balance will only
                    increase after a verified payment event.
                  </span>
                </div>
                <button className="secondary" onClick={() => setModal("")}>
                  Got it
                </button>
              </>
            ) : modal === "notifications" ? (
              <>
                <h2>You’re all caught up.</h2>
                <p>
                  Connection alerts, campaign updates, and low-balance
                  notifications will appear here.
                </p>
              </>
            ) : modal === "guide" ? (
              <>
                <span className="modal-symbol">
                  <Sparkles size={25} />
                </span>
                <h2>A strong start, step by step.</h2>
                <p>Your path to the first real conversation.</p>
                {[
                  "Configure Supabase and create your workspace",
                  "Connect WhatsApp, Gmail, or Zoho",
                  "Configure Plivo and test your voice agent",
                  "Approve pricing and activate Razorpay",
                  "Import consented contacts and launch a test",
                ].map((s, i) => (
                  <div className="guide-step" key={s}>
                    <span>{i + 1}</span>
                    {s}
                  </div>
                ))}
                <button
                  className="primary"
                  onClick={() => {
                    setModal("");
                    navigate("Integrations");
                  }}
                >
                  Explore integrations <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="modal-symbol">
                  <FileText size={25} />
                </span>
                <h2>
                  {modal === "voice"
                    ? "Create a voice agent"
                    : "Create a template"}
                </h2>
                <p>
                  Draft your content locally. Publishing requires a verified
                  workspace.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    const draft = Object.fromEntries(d) as Record<
                      string,
                      string
                    >;
                    localStorage.setItem(
                      "relay-" + modal,
                      JSON.stringify(draft),
                    );
                    setDrafts({ ...drafts, [modal]: draft });
                    setModal("");
                    notify("Draft saved locally");
                  }}
                >
                  <label>
                    Name
                    <input name="name" required maxLength={120} />
                  </label>
                  {modal === "voice" && (
                    <label>
                      Language
                      <select name="language">
                        <option>English</option>
                        <option>Hindi</option>
                      </select>
                    </label>
                  )}
                  <label>
                    {modal === "voice"
                      ? "Agent instructions"
                      : "Message content"}
                    <textarea
                      name="content"
                      required
                      rows={5}
                      maxLength={5000}
                    />
                  </label>
                  <button className="primary">Save draft</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function CampaignTable({
  campaigns,
  onOpen,
}: {
  campaigns: Campaign[];
  onOpen: (c: Campaign) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Campaign name</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Audience</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id}>
              <td>
                <button className="campaign-name" onClick={() => onOpen(c)}>
                  <span
                    className={
                      "campaign-symbol " +
                      (c.channel === "WhatsApp"
                        ? "whatsapp"
                        : c.channel === "Email"
                          ? "email"
                          : "voice")
                    }
                  >
                    {c.channel === "WhatsApp" ? (
                      <MessageCircle size={16} />
                    ) : c.channel === "Email" ? (
                      <Mail size={16} />
                    ) : (
                      <AudioLines size={16} />
                    )}
                  </span>
                  {c.name}
                </button>
              </td>
              <td>{c.channel}</td>
              <td>
                <span
                  className={
                    "status " + (c.status === "Draft" ? "gray" : "blue")
                  }
                >
                  <i />
                  {c.status}
                </span>
              </td>
              <td>
                {c.audience.toLocaleString()}{" "}
                <span className="muted">contacts</span>
              </td>
              <td className="muted">
                {c.id.startsWith("sample") ? "Sample data" : "Just now"}
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Open ${c.name}`}
                  onClick={() => onOpen(c)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!campaigns.length && (
        <div className="empty">No campaigns in this channel yet.</div>
      )}
    </div>
  );
}
function Schedule({ onSave }: { onSave: () => void }) {
  const [channel, setChannel] = useState("Email");
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      setValues(
        JSON.parse(localStorage.getItem("relay-schedule-" + channel) || "{}"),
      );
    } catch {
      setValues({});
    }
  }, [channel]);
  const update = (key: string, value: string) =>
    setValues({ ...values, [key]: value });
  return (
    <form
      className="settings-body"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          days.some(
            (d) =>
              values[d] === "on" &&
              (values[d + "Start"] || "09:00") >=
                (values[d + "End"] || "18:00"),
          )
        ) {
          alert("Each enabled day must end after it starts.");
          return;
        }
        localStorage.setItem(
          "relay-schedule-" + channel,
          JSON.stringify(values),
        );
        onSave();
      }}
    >
      <h3>Every channel, on your schedule.</h3>
      <p>Choose when outreach is allowed. No enabled days means no sending.</p>
      <label>
        Channel
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option>Email</option>
          <option>WhatsApp</option>
          <option>AI calling</option>
        </select>
      </label>
      {days.map((d) => (
        <div className="schedule-row" key={d}>
          <label className="checkbox-label">
            <input
              checked={values[d] === "on"}
              onChange={(e) => update(d, e.target.checked ? "on" : "off")}
              type="checkbox"
            />
            {d}
          </label>
          <input
            aria-label={`${d} start`}
            type="time"
            value={values[d + "Start"] || "09:00"}
            onChange={(e) => update(d + "Start", e.target.value)}
          />
          <span>to</span>
          <input
            aria-label={`${d} end`}
            type="time"
            value={values[d + "End"] || "18:00"}
            onChange={(e) => update(d + "End", e.target.value)}
          />
        </div>
      ))}
      <button className="primary">Save schedule</button>
    </form>
  );
}
