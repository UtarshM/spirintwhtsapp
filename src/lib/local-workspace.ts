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
export const templateButtonSchema = z.object({
  text: z.string().trim().min(1).max(80),
  url: z.string().max(2000),
  kind: z.enum(["URL", "Quick reply", "Phone"]).optional(),
});
export const templateCardSchema = z.object({
  id: identifier,
  title: z.string().trim().min(1).max(120),
  body: z.string().max(1000),
  mediaUrl: z.string().max(2000),
  buttons: z.array(templateButtonSchema).max(3),
});
const templateSchema = z.object({
  cards: z.array(templateCardSchema).max(10).optional(),
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
  buttons: z.array(templateButtonSchema).max(3).default([]),
});
const stepSchema = z.object({
  senderId: z.string().optional(),
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
  senderId: z.string().optional(),
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
  campaignId: z.string().optional(),
  threadId: z.string().optional(),
  senderId: z.string().optional(),
  subject: z.string().max(220).optional(),
  template: templateSchema.optional(),
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
  mailboxId: z.string().optional(),
  subject: z.string().max(200).optional(),
  campaignId: z.string().optional(),
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
    "availability",
    "reminder",
    "channel-setup",
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
    sequences: [
      {
        id: "seq-tri-channel",
        name: "Tri-Channel Outreach & Qualification",
        description:
          "Day 1: WhatsApp warm welcome → Day 2: Follow-up email → Day 3: AI Calling qualification with automatic Stop on Reply.",
        steps: [
          {
            id: "step-1",
            type: "WhatsApp",
            templateId: "welcome-wa",
            agentId: "",
            minutes: 60,
            condition: "Consent recorded",
          },
          {
            id: "step-2",
            type: "Delay",
            templateId: "",
            agentId: "",
            minutes: 1440,
            condition: "Consent recorded",
          },
          {
            id: "step-3",
            type: "Email",
            templateId: "followup-email",
            agentId: "",
            minutes: 60,
            condition: "Consent recorded",
          },
          {
            id: "step-4",
            type: "Delay",
            templateId: "",
            agentId: "",
            minutes: 1440,
            condition: "Consent recorded",
          },
          {
            id: "step-5",
            type: "AI calling",
            templateId: "",
            agentId: "agent-1",
            minutes: 300,
            condition: "Consent recorded",
          },
          {
            id: "step-6",
            type: "Handoff",
            templateId: "",
            agentId: "",
            minutes: 60,
            condition: "Qualified lead",
          },
        ],
        updatedAt: at,
      },
    ],
    agents: [
      {
        id: "agent-1",
        name: "Aarav - Inbound & Lead Qualifier",
        language: "English",
        voice: "Shubh (Sarvam Bulbul)",
        instructions:
          "Greet the prospect, qualify team size and monthly outreach volume, answer pricing queries, and offer to schedule a live walkthrough with our sales engineers.",
        knowledge:
          "Sprint by Scalezix unifies WhatsApp, email, and AI voice calls for Indian businesses starting at ₹3,000/month. We support official WhatsApp Cloud API, BYO-Plivo telephony, and Sarvam multilingual AI.",
        qualification:
          "1. What is your monthly lead volume? 2. Which outreach channels do you currently prioritize?",
        maxDuration: 300,
        concurrency: 2,
        handoff: "Transfer to sales closer when interest is confirmed",
        updatedAt: at,
      },
    ],
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
export function validateTemplateContent(template: LocalTemplate) {
  const errors: string[] = [];
  const supported = new Set(["first_name", "name", "company", "email"]);
  const checkText = (value: string) => {
    for (const match of value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g))
      if (!supported.has(match[1].trim()))
        errors.push("Template contains unsupported variables.");
  };
  const checkUrl = (value: string) => {
    if (!value) return;
    try {
      const url = new URL(value);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.host.includes("{")
      )
        throw Error();
    } catch {
      errors.push("Template URL must be http or https without credentials.");
    }
  };
  const checkButtons = (buttons: LocalTemplate["buttons"]) =>
    buttons.forEach((button) => {
      checkText(button.text);
      checkText(button.url);
      if (button.kind === "Phone") {
        if (!/^\+[1-9]\d{7,14}$/.test(button.url))
          errors.push("Button phone number must use international format.");
      } else if (button.kind !== "Quick reply") {
        if (!button.url) errors.push("URL button needs a destination URL.");
        else checkUrl(button.url);
      }
    });
  checkText(template.subject);
  checkText(template.body);
  checkUrl(template.mediaUrl);
  checkButtons(template.buttons);
  template.cards?.forEach((card) => {
    checkText(card.title);
    checkText(card.body);
    checkUrl(card.mediaUrl);
    checkButtons(card.buttons);
  });
  return [...new Set(errors)];
}
export function personalizeTemplate(
  template: LocalTemplate,
  contact: LocalContact,
): LocalTemplate {
  return {
    ...structuredClone(template),
    subject: personalize(template.subject, contact),
    body: personalize(template.body, contact),
    buttons: template.buttons.map((button) => ({
      ...button,
      text: personalize(button.text, contact),
      url: personalize(button.url, contact),
    })),
    cards: template.cards?.map((card) => ({
      ...card,
      title: personalize(card.title, contact),
      body: personalize(card.body, contact),
      buttons: card.buttons.map((button) => ({
        ...button,
        text: personalize(button.text, contact),
        url: personalize(button.url, contact),
      })),
    })),
  };
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
    if (t) errors.push(...validateTemplateContent(t));
    if (
      c.channel === "Email" &&
      c.senderId &&
      !s.resources.some(
        (r) =>
          r.id === c.senderId &&
          r.kind === "sender" &&
          r.data.archived !== "true",
      )
    )
      errors.push("Select an available local sender draft.");
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
  const template =
    c.channel === "AI calling"
      ? undefined
      : s.templates.find((t) => t.id === c.templateId);
  const threads = [...s.threads];
  const messages = [...s.messages];
  if (template)
    for (const contact of eligible) {
      const snapshot = personalizeTemplate(template, contact);
      let thread =
        c.channel === "WhatsApp"
          ? threads.find(
              (t) => t.contactId === contact.id && t.channel === "WhatsApp",
            )
          : undefined;
      if (!thread) {
        thread = {
          id: uid(),
          contactId: contact.id,
          channel: c.channel,
          assignee: "Scalezix team",
          status: "Open",
          draft: "",
          ...(c.channel === "Email"
            ? {
                mailboxId: c.senderId || "",
                subject: snapshot.subject,
                campaignId: c.id,
              }
            : {}),
        };
        threads.push(thread);
      }
      messages.push({
        id: uid(),
        contactId: contact.id,
        channel: c.channel,
        direction: "outbound",
        body: snapshot.body,
        subject: snapshot.subject,
        threadId: thread.id,
        senderId: c.senderId || "",
        template: snapshot,
        campaignId: c.id,
        at,
        kind: "Simulation",
      });
    }
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
    messages,
    threads,
  };
}
export function recordIncoming(
  s: LocalWorkspace,
  contactId: string,
  channel: Channel,
  body: string,
  threadId?: string,
): LocalWorkspace {
  const at = now();
  const target = threadId
    ? s.threads.find((t) => t.id === threadId)
    : s.threads.find((t) => t.contactId === contactId && t.channel === channel);
  if (
    threadId &&
    (!target || target.contactId !== contactId || target.channel !== channel)
  )
    throw Error("Conversation does not match this contact and channel.");
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
        threadId: target?.id,
        senderId: target?.mailboxId,
        subject: target?.subject,
      },
    ],
    threads: s.threads.map((t) =>
      (
        target
          ? t.id === target.id
          : t.contactId === contactId && t.channel === channel
      )
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
      step.type === "Email" &&
      step.senderId &&
      !s.resources.some(
        (r) =>
          r.id === step.senderId &&
          r.kind === "sender" &&
          r.data.archived !== "true",
      )
    )
      errors.push(`Step ${i + 1}: choose an available sender draft.`);
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
  const senderExists = (id: string | undefined) =>
    !id || s.resources.some((r) => r.id === id && r.kind === "sender");
  if (
    s.campaigns.some((c) => !senderExists(c.senderId)) ||
    s.threads.some((t) => !senderExists(t.mailboxId)) ||
    s.messages.some((m) => !senderExists(m.senderId))
  )
    throw Error("Backup contains a missing sender reference");
  if (
    s.messages.some(
      (m) =>
        m.threadId &&
        !s.threads.some(
          (t) =>
            t.id === m.threadId &&
            t.contactId === m.contactId &&
            t.channel === m.channel &&
            (t.channel !== "Email" ||
              (t.mailboxId || "") === (m.senderId || "")),
        ),
    )
  )
    throw Error("Backup contains an invalid conversation reference");
  for (const template of [
    ...s.templates,
    ...s.messages.flatMap((message) =>
      message.template ? [message.template] : [],
    ),
  ]) {
    const errors = validateTemplateContent(template);
    if (errors.some((e) => e.includes("URL") || e.includes("phone number")))
      throw Error(errors.join(" "));
  }
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
