import { z } from "zod";
const name = z.string().trim().min(1).max(120),
  id = z.uuid();
const step = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    channel: z.enum(["whatsapp", "email"]),
    templateId: id,
  }),
  z.object({ type: z.literal("call"), agentId: id }),
  z.object({
    type: z.literal("delay"),
    minutes: z.number().int().min(1).max(43200),
  }),
  z.object({
    type: z.literal("condition"),
    field: z.enum(["stage", "consent"]),
    equals: z.string().max(100),
  }),
  z.object({ type: z.literal("handoff") }),
]);
export const resources = {
  deals: {
    admin: false,
    schema: z
      .object({
        contact_id: id,
        title: name,
        stage: z.enum(["New", "Contacted", "Qualified", "Proposal", "Won"]),
        value_paise: z.number().int().nonnegative().max(100_000_000).default(0),
      })
      .strict(),
  },
  tasks: {
    admin: false,
    schema: z
      .object({
        contact_id: id.optional(),
        title: name,
        due_at: z.iso.datetime().optional(),
      })
      .strict(),
  },
  templates: {
    admin: true,
    schema: z
      .object({
        name,
        channel: z.enum(["whatsapp", "email", "voice"]),
        body: z.string().min(1).max(10000),
      })
      .strict(),
  },
  sequences: {
    admin: true,
    schema: z.object({ name, steps: z.array(step).min(1).max(50) }).strict(),
  },
  voice_agents: {
    admin: true,
    schema: z
      .object({
        name,
        language: z.enum(["en", "hi"]),
        instructions: z.string().min(20).max(10000),
        knowledge: z.string().max(50000).default(""),
        max_duration_seconds: z.number().int().min(30).max(900).default(300),
        max_concurrency: z.number().int().min(1).max(20).default(1),
      })
      .strict(),
  },
} as const;
export function getResource(name: string) {
  return Object.prototype.hasOwnProperty.call(resources, name)
    ? resources[name as keyof typeof resources]
    : null;
}
