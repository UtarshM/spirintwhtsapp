import {
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
  Settings,
} from "lucide-react";
export const groups = [
  {
    name: "Contacts",
    icon: Users,
    items: [
      ["contacts", "All contacts"],
      ["segments", "Saved segments"],
      ["contact-filters", "Advanced filters"],
      ["activity", "Contact activity"],
    ],
  },
  {
    name: "Campaigns",
    icon: Megaphone,
    items: [
      ["campaigns", "All campaigns"],
      ["audience-review", "Audience review"],
      ["campaign-schedule", "Scheduled campaigns"],
      ["campaign-history", "Execution history"],
    ],
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
    items: [
      ["wa-overview", "Dashboard"],
      ["wa-onboarding", "Connect WhatsApp"],
      ["wa-health", "Account health"],
      ["wa-provider-inbox", "Provider conversations"],
      ["wa-templates", "Templates & approval"],
      ["wa-broadcast", "Broadcasts"],
      ["catalog", "Catalog & payments"],
      ["verification", "Blue tick verification"],
    ],
  },
  {
    name: "Inbox",
    icon: MessageCircle,
    items: [
      ["inbox-overview", "All conversations"],
      ["wa-inbox", "WhatsApp inbox"],
      ["email-inbox", "Email inbox"],
      ["handoffs", "Assignment & takeover"],
    ],
  },
  {
    name: "Automation",
    icon: GitBranch,
    items: [
      ["sequences", "Outreach sequences"],
      ["bots", "Chatbot flow builder"],
      ["chat-agents", "WhatsApp AI agents"],
      ["automation-handoffs", "Human takeover"],
    ],
  },
  {
    name: "Lead capture",
    icon: Sparkles,
    items: [
      ["sources", "Ads & lead sources"],
      ["forms", "Forms"],
      ["sheets", "Google Sheets"],
      ["webhooks", "Webhooks"],
      ["qualified", "Qualified leads"],
    ],
  },
  {
    name: "Email",
    icon: Mail,
    items: [
      ["email-overview", "Dashboard"],
      ["email-setup", "Gmail & Zoho setup"],
      ["senders", "Mailboxes & senders"],
      ["identities", "Sender identities"],
      ["email-templates", "Templates"],
      ["email-sync", "Reply synchronization"],
    ],
  },
  {
    name: "AI Calling",
    icon: Phone,
    items: [
      ["voice-overview", "Dashboard"],
      ["voice-connected", "Connection & live calls"],
      ["agents", "Agent builder"],
      ["call-center", "Call center"],
      ["call-logs", "Call logs & transcripts"],
      ["transfers", "Transfers"],
      ["ivr", "IVR menus"],
    ],
  },
  {
    name: "Booking",
    icon: CalendarDays,
    items: [
      ["availability", "Calendar availability"],
      ["bookings", "Appointments"],
      ["reminders", "Reminders"],
    ],
  },
  {
    name: "Reporting",
    icon: BarChart3,
    items: [
      ["analytics", "Activity analytics"],
      ["channel-costs", "Channel costs"],
      ["delivery", "Delivery reports"],
      ["automation", "Automation reports"],
    ],
  },
  {
    name: "Billing",
    icon: Wallet,
    items: [
      ["billing", "Plans & credits"],
      ["orders", "Orders"],
      ["invoices", "Invoices"],
      ["rates", "Credit rates"],
    ],
  },
  {
    name: "Acquisition tools",
    icon: Link2,
    items: [
      ["links", "WhatsApp links"],
      ["qr", "QR codes"],
      ["widget", "Website chat button"],
    ],
  },
  {
    name: "Workspace",
    icon: Settings,
    items: [
      ["tasks", "Follow-up tasks"],
      ["windows", "Working days"],
      ["integrations", "Integrations"],
      ["settings", "Settings & backups"],
      ["team", "Team"],
    ],
  },
] satisfies { name: string; icon: typeof Users; items: string[][] }[];
export const names: Record<string, string> = Object.fromEntries([
  ["overview", "Overview"],
  ...groups.flatMap((g) =>
    g.items.map(([id, title]) => [id, `${g.name} / ${title}`]),
  ),
]);
