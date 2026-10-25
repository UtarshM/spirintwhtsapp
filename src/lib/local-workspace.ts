import { z } from "zod";
import { initialContacts } from "./demo";
export const channelSchema = z.enum(["WhatsApp", "Email", "AI calling"]);
const identifier = z.string().min(1).max(100),
  short = z.string().max(200),
  timestamp = z.string();
export const localContactSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(120),
  company: short,
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().max(25),
  stage: short,
  tags: z.array(short).max(30),
  consent: z.boolean(),
  optedOut: z.boolean().default(false),
  owner: short.default("Scalezix team"),
  notes: z.string().max(10000).default(""),
  value: z.number().nonnegative().default(0),
  createdAt: timestamp.default(""),
});
const templateSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(200),
  channel: channelSchema,
  subject: short,
  body: z.string().max(10000),
  status: z.enum(["Draft", "Ready"]),
  updatedAt: timestamp,
  category: z
    .enum(["Marketing", "Utility", "Authentication"])
    .default("Marketing"),
  mediaUrl: z.string().max(2000).default(""),
  buttons: z
    .array(
      z.object({ text: z.string().min(1).max(80), url: z.string().max(2000) }),
    )
    .max(3)
    .default([]),
});
const stepSchema = z.object({
  id: identifier,
  type: z.enum([
    "WhatsApp",
    "Email",
    "AI calling",
    "Delay",
    "Condition",
    "Handoff",
  ]),
  templateId: z.string(),
  agentId: z.string(),
  minutes: z.number().int().min(1).max(43200),
  condition: z.enum(["Consent recorded", "Qualified lead"]),
});
const sequenceSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  steps: z.array(stepSchema).max(50),
  updatedAt: timestamp,
});
const campaignSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(200),
  channel: channelSchema,
  templateId: z.string(),
  agentId: z.string(),
  contactIds: z.array(identifier),
  status: z.enum(["Draft", "Scheduled", "Paused", "Cancelled", "Completed"]),
  scheduledAt: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
  runId: z.string().optional(),
});
const attachmentSchema = z.object({
  id: identifier,
  name: z.string().min(1).max(200),
  type: z.enum(["image/png", "image/jpeg", "application/pdf", "text/plain"]),
  size: z.number().int().nonnegative().max(1000000),
  dataUrl: z
    .string()
    .max(1500000)
    .regex(
      /^data:(image\/png|image\/jpeg|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=\r\n]*$/,
    ),
});
const messageSchema = z.object({
  attachments: z.array(attachmentSchema).max(3).optional(),
  id: identifier,
  contactId: identifier,
  channel: channelSchema,
  direction: z.enum(["inbound", "outbound"]),
  body: z.string().max(10000),
  at: timestamp,
  kind: z.enum(["Sample", "Local draft", "Simulation"]),
});
const threadSchema = z.object({
  attachments: z.array(attachmentSchema).max(3).optional(),
  id: identifier,
  contactId: identifier,
  channel: channelSchema,
  assignee: short,
  status: z.enum(["Open", "Closed"]),
  draft: z.string().max(10000),
});
const agentSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1).max(200),
  language: z.enum(["English", "Hindi"]),
  voice: short,
  instructions: z.string().max(10000),
  knowledge: z.string().max(30000),
  qualification: z.string().max(2000),
  maxDuration: z.number().int().min(30).max(900),
  concurrency: z.number().int().min(1).max(20),
  handoff: short,
  updatedAt: timestamp,
});
const callSchema = z.object({
  id: identifier,
  agentId: identifier,
  contactId: identifier,
  at: timestamp,
  outcome: z.enum(["Qualified", "Follow-up", "Not interested"]),
  duration: z.number(),
  transcript: z.array(
    z.object({ speaker: z.enum(["Agent", "Contact"]), text: z.string() }),
  ),
});
const activitySchema = z.object({
  id: identifier,
  contactId: z.string(),
  campaignId: z.string(),
  kind: z.enum([
    "contact",
    "note",
    "stage",
    "local_reply",
    "inbound_reply",
    "opt_out",
    "simulation",
    "task",
    "credit",
    "handoff",
  ]),
  description: z.string(),
  at: timestamp,
  channel: channelSchema.optional(),
});
const transactionSchema = z.object({
  id: identifier,
  kind: z.enum(["Sample opening balance", "Simulation usage", "Sample top-up"]),
  credits: z.number().int(),
  at: timestamp,
  reference: z.string(),
});
const windowSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d\d:\d\d$/),
  end: z.string().regex(/^\d\d:\d\d$/),
});
export const resourceSchema = z.object({
  id: identifier,
  kind: z.enum([
    "segment",
    "bot",
    "chat-agent",
    "lead-source",
    "form",
    "product",
    "transfer",
    "ivr",
    "booking",
    "sender",
    "identity",
    "widget",
  ]),
  name: z.string().trim().min(1).max(120),
  data: z.record(z.string(), z.string().max(30000)),
  updatedAt: timestamp,
});
const sequenceRunSchema = z.object({
  id: identifier,
  sequenceId: identifier,
  contactId: identifier,
  startedAt: timestamp,
  cursor: z.number().int().nonnegative(),
  status: z.enum(["Running", "Waiting", "Completed", "Stopped"]),
  nextAt: timestamp,
  history: z.array(z.string()),
  steps: z.array(stepSchema),
});
export const workspaceSchema = z.object({
  resources: z.array(resourceSchema).max(5000).default([]),
  sequenceRuns: z.array(sequenceRunSchema).max(5000).default([]),
  version: z.literal(1),
  settings: z.object({
    name: z.string().min(1).max(120),
    product: z.string().min(1).max(40),
    timezone: z.string(),
    stages: z.array(z.string().min(1).max(40)).min(2).max(12),
    lowBalance: z.number().int().min(0),
    stopOnReply: z.boolean(),
    notifications: z.boolean(),
  }),
  contacts: z.array(localContactSchema).max(10000),
  templates: z.array(templateSchema).max(1000),
  campaigns: z.array(campaignSchema).max(2000),
  sequences: z.array(sequenceSchema).max(1000),
  agents: z.array(agentSchema).max(100),
  calls: z.array(callSchema).max(2000),
  messages: z.array(messageSchema).max(20000),
  threads: z.array(threadSchema).max(10000),
  activities: z.array(activitySchema).max(30000),
  transactions: z.array(transactionSchema).max(10000),
  tasks: z
    .array(
      z.object({
        id: identifier,
        contactId: identifier,
        title: z.string().min(1).max(200),
        dueAt: z.string(),
        done: z.boolean(),
      }),
    )
    .max(5000),
  team: z
    .array(
      z.object({
        id: identifier,
        name: z.string().trim().min(1).max(200),
        email: z.email(),
        role: z.enum(["Owner", "Administrator", "Sales agent"]),
        status: z.enum(["Active", "Invited"]),
      }),
    )
    .max(100),
  windows: z.record(z.string(), z.array(windowSchema).length(7)),
});
export type LocalWorkspace = z.infer<typeof workspaceSchema>;
export type LocalContact = LocalWorkspace["contacts"][number];
export type LocalCampaign = LocalWorkspace["campaigns"][number];
export type LocalTemplate = LocalWorkspace["templates"][number];
export type LocalSequence = LocalWorkspace["sequences"][number];
export type LocalAgent = LocalWorkspace["agents"][number];
export type Channel = z.infer<typeof channelSchema>;
export const channels: Channel[] = ["WhatsApp", "Email", "AI calling"];
export const storageKey = "relay-workspace-v1";
export function uid() {
  return crypto.randomUUID();
}
export function now() {
  return new Date().toISOString();
}
export function createLocalWorkspace(): LocalWorkspace {
  const at = now();
  return {
    version: 1,
    resources: [],
    sequenceRuns: [],
    settings: {
      name: "Scalezix workspace",
      product: "Sprint",
      timezone: "Asia/Kolkata",
      stages: ["New", "Contacted", "Replied", "Qualified", "Not interested"],
      lowBalance: 100,
      stopOnReply: true,
      notifications: true,
    },
    contacts: initialContacts.map((c) => ({
      ...c,
      optedOut: false,
      owner: "Scalezix team",
      notes: "",
      value: 0,
      createdAt: at,
    })),
    templates: [
      {
        id: "welcome-wa",
        name: "A warm welcome",
        channel: "WhatsApp",
        subject: "",
        body: "Hi {{first_name}}, thanks for connecting with {{company}}. What can we help you with today?",
        status: "Ready",
        category: "Marketing",
        mediaUrl: "",
        buttons: [],
        updatedAt: at,
      },
      {
        id: "followup-email",
        name: "Keep the conversation going",
        channel: "Email",
        subject: "A quick follow-up, {{first_name}}",
        body: "Hi {{first_name}},\n\nThanks for your time. Would you like to explore how we can help {{company}}?\n\nBest,\nThe Scalezix team",
        status: "Ready",
        category: "Marketing",
        mediaUrl: "",
        buttons: [],
        updatedAt: at,
      },
    ],
    campaigns: [],
    sequences: [],
    agents: [],
    calls: [],
    threads: [
      {
        id: "thread-1",
        contactId: "1",
        channel: "WhatsApp",
        assignee: "Scalezix team",
        status: "Open",
        draft: "",
      },
      {
        id: "thread-2",
        contactId: "2",
        channel: "Email",
        assignee: "Scalezix team",
        status: "Open",
        draft: "",
      },
    ],
    messages: [
      {
        id: "sample-message-1",
        contactId: "1",
        channel: "WhatsApp",
        direction: "inbound",
        body: "Could you share a little more about WhatsApp campaigns and AI calling?",
        at,
        kind: "Sample",
      },
      {
        id: "sample-message-2",
        contactId: "2",
        channel: "Email",
        direction: "inbound",
        body: "Thanks for reaching out. Could we discuss our next steps?",
        at,
        kind: "Sample",
      },
    ],
    activities: [],
    transactions: [
      {
        id: "sample-opening",
        kind: "Sample opening balance",
        credits: 500,
        at,
        reference: "Local simulation only · No money paid",
      },
    ],
    tasks: [],
    team: [
      {
        id: "owner",
        name: "Scalezix team",
        email: "team@example.com",
        role: "Owner",
        status: "Active",
      },
    ],
    windows: Object.fromEntries(
      channels.map((c) => [
        c,
        Array.from({ length: 7 }, (_, i) => ({
          enabled: i > 0 && i < 6,
          start: "09:00",
          end: "18:00",
        })),
      ]),
    ),
  };
}
export function balance(s: LocalWorkspace) {
  return s.transactions.reduce((sum, t) => sum + t.credits, 0);
}
export function personalize(body: string, contact: LocalContact) {
  return body.replace(
    /\{\{\s*(first_name|name|company|email)\s*\}\}/g,
    (_, key) =>
      ({
        first_name: contact.name.split(" ")[0],
        name: contact.name,
        company: contact.company || "your business",
        email: contact.email,
      })[key as "name"] || "",
  );
}
export function eligibleContacts(s: LocalWorkspace, c: LocalCampaign) {
  return s.contacts.filter(
    (p) =>
      c.contactIds.includes(p.id) &&
      p.consent &&
      !p.optedOut &&
      (c.channel === "Email" ? Boolean(p.email) : Boolean(p.phone)) &&
      (!s.settings.stopOnReply ||
        !s.activities.some(
          (a) =>
            a.contactId === p.id &&
            (a.kind === "inbound_reply" || a.kind === "handoff") &&
            a.at >= c.createdAt,
        )),
  );
}
export function validateCampaign(s: LocalWorkspace, c: LocalCampaign) {
  const errors: string[] = [];
  if (!c.name.trim()) errors.push("Give the campaign a name.");
  if (!eligibleContacts(s, c).length)
    errors.push(
      "Choose at least one eligible contact with consent and a channel address.",
    );
  if (c.channel === "AI calling") {
    if (!s.agents.some((a) => a.id === c.agentId))
      errors.push("Choose a voice agent.");
  } else {
    const t = s.templates.find(
      (t) => t.id === c.templateId && t.channel === c.channel,
    );
    if (!t || t.status !== "Ready")
      errors.push("Choose a ready template for this channel.");
    if (
      t &&
      /\{\{\s*(?!first_name\s*\}\}|name\s*\}\}|company\s*\}\}|email\s*\}\})[^}]+\}\}/.test(
        `${t.subject} ${t.body}`,
      )
    )
      errors.push("Template contains unsupported variables.");
  }
  if (c.status === "Completed" || c.status === "Cancelled")
    errors.push(
      "Completed or cancelled campaigns cannot run again. Duplicate the campaign to start a new run.",
    );
  return errors;
}
export const simulationRates: Record<Channel, number> = {
  WhatsApp: 1,
  Email: 1,
  "AI calling": 5,
};
export function simulateCampaign(
  s: LocalWorkspace,
  id: string,
): LocalWorkspace {
  const c = s.campaigns.find((c) => c.id === id);
  if (!c) throw new Error("Campaign not found");
  const errors = validateCampaign(s, c);
  if (errors.length) throw new Error(errors.join(" "));
  const eligible = eligibleContacts(s, c);
  const cost = eligible.length * simulationRates[c.channel];
  if (balance(s) < cost)
    throw new Error(
      "Not enough sample credits. Add sample credits in Credits & billing.",
    );
  const at = now(),
    runId = uid();
  const template = s.templates.find((t) => t.id === c.templateId);
  return {
    ...s,
    campaigns: s.campaigns.map((x) =>
      x.id === id ? { ...x, status: "Completed", runId, updatedAt: at } : x,
    ),
    transactions: [
      ...s.transactions,
      {
        id: uid(),
        kind: "Simulation usage",
        credits: -cost,
        at,
        reference: `${c.name} · ${runId}`,
      },
    ],
    activities: [
      ...s.activities,
      ...eligible.map((p) => ({
        id: uid(),
        contactId: p.id,
        campaignId: id,
        kind: "simulation" as const,
        description: `${c.channel} campaign simulated: ${c.name}`,
        at,
        channel: c.channel,
      })),
    ],
    messages: template
      ? [
          ...s.messages,
          ...eligible.map((p) => ({
            id: uid(),
            contactId: p.id,
            channel: c.channel,
            direction: "outbound" as const,
            body: personalize(template.body, p),
            at,
            kind: "Simulation" as const,
          })),
        ]
      : s.messages,
    threads: [
      ...s.threads,
      ...eligible
        .filter(
          (p) =>
            !s.threads.some(
              (t) => t.contactId === p.id && t.channel === c.channel,
            ),
        )
        .map((p) => ({
          id: uid(),
          contactId: p.id,
          channel: c.channel,
          assignee: "Scalezix team",
          status: "Open" as const,
          draft: "",
        })),
    ],
  };
}
export function recordIncoming(
  s: LocalWorkspace,
  contactId: string,
  channel: Channel,
  body: string,
): LocalWorkspace {
  const at = now();
  return {
    ...s,
    messages: [
      ...s.messages,
      {
        id: uid(),
        contactId,
        channel,
        direction: "inbound",
        body,
        at,
        kind: "Simulation",
      },
    ],
    threads: s.threads.map((t) =>
      t.contactId === contactId && t.channel === channel
        ? { ...t, status: "Open" }
        : t,
    ),
    activities: [
      ...s.activities,
      {
        id: uid(),
        contactId,
        campaignId: "",
        kind: "inbound_reply",
        description: "Simulated inbound reply — pending outreach suppressed",
        at,
        channel,
      },
    ],
  };
}
export function validateSequence(s: LocalWorkspace, seq: LocalSequence) {
  const errors: string[] = [];
  if (!seq.name.trim()) errors.push("Give the sequence a name.");
  if (!seq.steps.length) errors.push("Add at least one step.");
  seq.steps.forEach((step, i) => {
    if (step.type === "WhatsApp" || step.type === "Email") {
      if (
        !s.templates.some(
          (t) =>
            t.id === step.templateId &&
            t.channel === step.type &&
            t.status === "Ready",
        )
      )
        errors.push(`Step ${i + 1}: choose a ready ${step.type} template.`);
    }
    if (
      step.type === "AI calling" &&
      !s.agents.some((a) => a.id === step.agentId)
    )
      errors.push(`Step ${i + 1}: choose a voice agent.`);
  });
  return errors;
}
export function validateBackup(input: unknown) {
  const s = workspaceSchema.parse(input);
  for (const rows of [
    s.contacts,
    s.templates,
    s.campaigns,
    s.sequences,
    s.agents,
    s.calls,
    s.messages,
    s.threads,
    s.activities,
    s.transactions,
    s.tasks,
    s.team,
    s.resources,
    s.sequenceRuns,
  ]) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length)
      throw new Error("Duplicate record IDs in backup");
  }
  for (const channel of channels) {
    const windows = s.windows[channel];
    if (!windows || windows.length !== 7)
      throw new Error("Missing channel sending windows");
    if (
      windows.some(
        (w) =>
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.end) ||
          (w.enabled && w.start >= w.end),
      )
    )
      throw new Error("Invalid sending window in backup");
  }
  const ids = new Set(s.contacts.map((c) => c.id));
  if (ids.size !== s.contacts.length)
    throw new Error("Duplicate contact IDs in backup");
  if (
    s.campaigns.some((c) => c.contactIds.some((id) => !ids.has(id))) ||
    s.threads.some((t) => !ids.has(t.contactId)) ||
    s.messages.some((m) => !ids.has(m.contactId)) ||
    s.tasks.some((t) => !ids.has(t.contactId)) ||
    s.calls.some(
      (c) => !ids.has(c.contactId) || !s.agents.some((a) => a.id === c.agentId),
    ) ||
    s.sequenceRuns.some(
      (r) =>
        !ids.has(r.contactId) ||
        !s.sequences.some((seq) => seq.id === r.sequenceId),
    ) ||
    s.resources.some((r) => r.data.contactId && !ids.has(r.data.contactId))
  )
    throw new Error("Backup contains missing contact references");
  if (balance(s) < 0) throw new Error("Backup has an invalid credit balance");
  for (const timezone of [s.settings.timezone])
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  return s;
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function toCsv(rows: unknown[][]) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
