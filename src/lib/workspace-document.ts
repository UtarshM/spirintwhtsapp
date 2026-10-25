import { z } from "zod";
import {
  createLocalWorkspace,
  validateBackup,
  type LocalWorkspace,
} from "./local-workspace";

export type AccountIdentity = {
  email: string;
  workspaceId: string;
  userId: string;
  role: string;
  name: string;
  canEdit: boolean;
};
export const documentWriteSchema = z
  .object({ revision: z.number().int().min(0), state: z.unknown() })
  .strict();
export const MAX_DOCUMENT_BYTES = 8_000_000;

// An authenticated workspace must never inherit anonymous demo contacts, messages or money.
export function createEmptyWorkspace(name = "My workspace"): LocalWorkspace {
  const sample = createLocalWorkspace();
  return {
    ...sample,
    settings: { ...sample.settings, name },
    contacts: [],
    templates: [],
    campaigns: [],
    sequences: [],
    sequenceRuns: [],
    agents: [],
    calls: [],
    messages: [],
    threads: [],
    activities: [],
    transactions: [],
    tasks: [],
    team: [],
    resources: [],
  };
}

export function parseDocumentWrite(input: unknown) {
  const request = documentWriteSchema.parse(input);
  if (
    new TextEncoder().encode(JSON.stringify(input)).byteLength >
    MAX_DOCUMENT_BYTES
  )
    throw Error(
      "Workspace exceeds the 8 MB draft limit. Export older attachments before retrying.",
    );
  return { revision: request.revision, state: validateBackup(request.state) };
}

export function seedAccountRecords(
  name: string,
  contacts: Record<string, unknown>[],
  campaigns: Record<string, unknown>[],
): LocalWorkspace {
  const state = createEmptyWorkspace(name);
  // Copy earlier account records into the planning document once. The original
  // operational rows stay intact; no recipients or provider events are invented.
  state.contacts = contacts.map((c) => ({
    id: String(c.id),
    name: String(c.name),
    company: String(c.company || ""),
    email: String(c.email || ""),
    phone: String(c.phone || ""),
    stage: String(c.stage || "New"),
    tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
    consent: c.consent === true,
    optedOut: !!c.opted_out_at,
    owner: "",
    notes: "",
    value: 0,
    createdAt: String(c.created_at || ""),
  }));
  state.campaigns = campaigns.map((c) => ({
    id: String(c.id),
    name: String(c.name),
    channel:
      c.channel === "email"
        ? "Email"
        : c.channel === "voice"
          ? "AI calling"
          : "WhatsApp",
    templateId: "",
    agentId: "",
    contactIds: [],
    status: "Draft",
    scheduledAt: "",
    createdAt: String(c.created_at || ""),
    updatedAt: String(c.created_at || ""),
  }));
  if (contacts.length || campaigns.length)
    state.activities = [
      {
        id: "account-records-copy",
        contactId: "",
        campaignId: "",
        kind: "note",
        description: `Copied ${contacts.length} contacts and ${campaigns.length} campaign planning drafts from earlier account records. Original records and execution states remain in Account controls. No recipients or schedules were activated.`,
        at: new Date().toISOString(),
      },
    ];
  return validateBackup(state);
}
